# Version 7 of the scanner head: a small neural network (one hidden layer) on the same TinyCLIP features.
# Uses the same photos and the same seeded held-out splits as eval-recyclables3.mjs, so the numbers compare
# directly with the live head. Settings are chosen on a validation slice of the training photos, never on a test.
# Usage: python -P train-mlp.py <folder with emb_*.json> [sweep] [hidden=128 drop=0.3 noise=0] [write <out.json>]
import json
import sys
from pathlib import Path

import numpy as np

root = Path(sys.argv[1])
load = lambda f: json.loads((root / f).read_text("utf8"))
opts = dict(a.split("=") for a in sys.argv[2:] if "=" in a)

CLASSES = ["cardboard", "glass", "metal", "paper", "plastic", "trash", "electronics"]
K = len(CLASSES)


def split(data, seed, key=lambda d: d["cls"]):
    """The same seeded shuffle as the JavaScript tools, so the held-out photos are identical."""
    s = [seed]

    def rand():
        s[0] = (s[0] * 1664525 + 1013904223) % 4294967296
        return s[0] / 4294967296

    train, test = [], []
    for k in sorted({key(d) for d in data}):
        g = [d for d in data if key(d) == k]
        for i in range(len(g) - 1, 0, -1):
            j = int(rand() * (i + 1))
            g[i], g[j] = g[j], g[i]
        cut = len(g) * 8 // 10
        train += g[:cut]
        test += g[cut:]
    return train, test


tn = load("emb_trashnet.json")
rw = load("emb_realwaste.json")
ew = [d for d in load("emb_electronics.json") if d.get("sub") != "clutter"]
kg = load("emb_kaggle.json")
tb = load("emb_trashbusters.json")
tb2 = load("emb_trashbusters_train.json")
tnTr, tnTe = split(tn, 42)
rwTr, rwTe = split(rw, 7)
ewTr, ewTe = split(ew, 11, lambda d: d["sub"])
tbTr, tbTe = split(tb, 21, lambda d: f'{d["source"]}|{d["context"]}|{d["cls"]}')
kgTe = [d for d in kg if d["split"] == "test"]
kgTr = [d for d in kg if d["split"] != "test"]
tbReal = [d for d in tbTe if d["context"] == "real_world"]

X = lambda s: np.array([d["e"] for d in s], dtype=np.float32)
Y = lambda s: np.array([CLASSES.index(d["cls"]) for d in s])

# The public sets overlap: TrashBusters repackages TrashNet and others, and some photos appear twice. Two photos
# whose features are this close (cosine, the features are unit length) count as the same photo.
SAME = 0.95


def nearest(a, b):
    """For each photo in a, the cosine to its closest photo in b."""
    A, B = X(a), X(b)
    return np.concatenate([(A[i : i + 500] @ B.T).max(1) for i in range(0, len(A), 500)])


tests = tnTe + rwTe + ewTe + tbTe + kgTe
pool = tnTr + rwTr + ewTr + tbTr + tb2 + kgTr
# Training never sees a copy of a test photo, so every test is a fair test of a head trained here.
cleanPool = [d for d, c in zip(pool, nearest(pool, tests)) if c < SAME]
order = np.random.default_rng(5).permutation(len(cleanPool))
val = [cleanPool[i] for i in order[: len(cleanPool) // 10]]
rest = [cleanPool[i] for i in order[len(cleanPool) // 10 :]]
# The same for the validation slice that picks the settings and the temperature.
fit = [d for d, c in zip(rest, nearest(rest, val)) if c < SAME]
# The live heads were trained on the full pool, so they are compared only on test photos with no copy in it.
novelIds = {id(d) for d, c in zip(tests, nearest(tests, pool)) if c < SAME}
novel = lambda s: [d for d in s if id(d) in novelIds]


def softmax(z):
    z = z - z.max(1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(1, keepdims=True)


class Linear:
    def __init__(self, h):
        self.mean, self.std = np.array(h["mean"]), np.array(h["std"])
        self.W, self.b = np.array(h["W"], np.float32), np.array(h["b"], np.float32)
        self.T = 1.0

    def probs(self, x):
        return softmax((((x - self.mean) / self.std) @ self.W.T + self.b) / self.T)


class MLP:
    def __init__(self, hidden, seed):
        r = np.random.default_rng(seed)
        self.W1 = (r.standard_normal((512, hidden)) * np.sqrt(2 / 512)).astype(np.float32)
        self.b1 = np.zeros(hidden, np.float32)
        self.W2 = (r.standard_normal((hidden, K)) * np.sqrt(1 / hidden)).astype(np.float32)
        self.b2 = np.zeros(K, np.float32)
        self.T = 1.0

    def probs(self, x):
        hdn = np.maximum(0, ((x - self.mean) / self.std) @ self.W1 + self.b1)
        return softmax((hdn @ self.W2 + self.b2) / self.T)


def adam(params, grads, state, rate, step):
    for i, (p, g) in enumerate(zip(params, grads)):
        m, v = state[i]
        m[:] = 0.9 * m + 0.1 * g
        v[:] = 0.999 * v + 0.001 * g * g
        p -= rate * (m / (1 - 0.9**step)) / (np.sqrt(v / (1 - 0.999**step)) + 1e-8)


def batches(n, r):
    return np.array_split(r.permutation(n), max(1, n // 256))


def class_weights(y):
    return (len(y) / (K * np.maximum(1, np.bincount(y, minlength=K)))).astype(np.float32)


def train_linear(fitset, epochs=40, lr=1e-3, wd=1e-4, seed=1):
    """The same kind of head as v5 and v6, trained on the same photos as v7, for a like-for-like comparison."""
    x, y = X(fitset), Y(fitset)
    h = Linear({"mean": x.mean(0), "std": x.std(0) + 1e-6, "W": np.zeros((K, 512)), "b": np.zeros(K)})
    xs = (x - h.mean) / h.std
    cw = class_weights(y)
    state = [(np.zeros_like(p), np.zeros_like(p)) for p in [h.W, h.b]]
    r = np.random.default_rng(seed)
    step = 0
    for ep in range(epochs):
        rate = lr * 0.5 * (1 + np.cos(np.pi * ep / epochs))  # cosine decay
        for idx in batches(len(y), r):
            g = softmax(xs[idx] @ h.W.T + h.b)
            g[np.arange(len(idx)), y[idx]] -= 1
            w = cw[y[idx]][:, None]
            g = g * w / w.sum()
            step += 1
            adam([h.W, h.b], [g.T @ xs[idx] + wd * h.W, g.sum(0)], state, rate, step)
    return h


def train_mlp(fitset, hidden=128, epochs=40, lr=1e-3, wd=1e-4, drop=0.3, noise=0.0, smooth=0.05, seed=1):
    x, y = X(fitset), Y(fitset)
    m = MLP(hidden, seed)
    m.mean, m.std = x.mean(0), x.std(0) + 1e-6
    xs = (x - m.mean) / m.std
    cw = class_weights(y)
    params = [m.W1, m.b1, m.W2, m.b2]
    state = [(np.zeros_like(p), np.zeros_like(p)) for p in params]
    r = np.random.default_rng(seed)
    step = 0
    for ep in range(epochs):
        rate = lr * 0.5 * (1 + np.cos(np.pi * ep / epochs))
        for idx in batches(len(y), r):
            xb = xs[idx]
            if noise:
                xb = xb + r.standard_normal(xb.shape).astype(np.float32) * noise
            pre = xb @ m.W1 + m.b1
            mask = (r.random(pre.shape) >= drop).astype(np.float32) / (1 - drop)
            hd = np.maximum(0, pre) * mask
            p = softmax(hd @ m.W2 + m.b2)
            t = np.full((len(idx), K), smooth / K, np.float32)
            t[np.arange(len(idx)), y[idx]] += 1 - smooth
            w = cw[y[idx]][:, None]
            g = (p - t) * w / w.sum()
            gh = (g @ m.W2.T) * mask * (pre > 0)
            step += 1
            adam(params, [xb.T @ gh + wd * m.W1, gh.sum(0), hd.T @ g + wd * m.W2, g.sum(0)], state, rate, step)
    return m


def fit_temperature(model, s):
    """The temperature that makes the confidence honest on the validation photos (lowest log loss)."""
    x, y = X(s), Y(s)
    best = (1e9, 1.0)
    for T in np.arange(0.5, 3.01, 0.05):
        model.T = T
        p = model.probs(x)
        best = min(best, (-np.log(p[np.arange(len(y)), y] + 1e-9).mean(), T))
    model.T = best[1]
    return best[1]


def acc(model, s):
    return (model.probs(X(s)).argmax(1) == Y(s)).mean() if s else float("nan")


def found(model, s, cls="electronics"):
    return (model.probs(X(s)).argmax(1) == CLASSES.index(cls)).mean() if s else float("nan")


def sure(model, s, at=0.7):
    """At the app's 'Looks like' bar: the share of photos it names, and how often that name is wrong."""
    p = model.probs(X(s))
    named = p.max(1) >= at
    wrong = (p.argmax(1)[named] != Y(s)[named]).mean() if named.any() else 0
    return named.mean(), wrong


def table(heads, f, title):
    print("\n" + title)
    print("".ljust(36) + "".join(n.ljust(26) for n in heads))
    rows = [
        ("TrashNet", lambda h: acc(h, f(tnTe))),
        ("RealWaste (real photos)", lambda h: acc(h, f(rwTe))),
        ("TrashBusters (all)", lambda h: acc(h, f(tbTe))),
        ("TrashBusters real-world", lambda h: acc(h, f(tbReal))),
        ("Commons electronics found", lambda h: found(h, f(ewTe))),
        ("Kaggle electronics found", lambda h: found(h, f(kgTe))),
        ("Recyclables called electronics", lambda h: found(h, f(tnTe + rwTe + tbTe))),
    ]
    for label, fn in rows:
        print(label.ljust(36) + "".join(f"{100 * fn(h):.1f}%".ljust(26) for h in heads.values()))
    for at in [0.7, 0.85]:
        for name, s in [("recyclables", tnTe + rwTe + tbTe), ("real-world", tbReal + rwTe)]:
            print(f"At {int(at * 100)}% sure, {name}:".ljust(36) + "".join(
                "names {:.0f}%, wrong {:.1f}%".format(*(100 * v for v in sure(h, f(s), at))).ljust(26) for h in heads.values()))


if __name__ == "__main__":
    print(f"pool {len(pool)}, {len(pool) - len(cleanPool)} dropped as copies of test photos; fit {len(fit)}, val {len(val)}")

    if "sweep" in sys.argv:
        valReal = [d for d in val if d.get("context") == "real_world"]
        lin = train_linear(fit)
        print(f"linear: val {acc(lin, val):.3f}, val real-world {acc(lin, valReal):.3f} ({len(valReal)})", flush=True)
        for hidden in [64, 128, 256]:
            for drop in [0.2, 0.5]:
                for noise in [0.0, 0.5]:
                    m = train_mlp(fit, hidden=hidden, drop=drop, noise=noise)
                    print(f"hidden {hidden} drop {drop} noise {noise}: val {acc(m, val):.3f}, val real-world {acc(m, valReal):.3f}", flush=True)
        sys.exit()

    v5 = Linear(json.loads((root / "live-head-v5.json").read_text()))
    v6 = Linear(json.loads((root / "live-head-v6.json").read_text()))
    lin = train_linear(fit)
    Tl = fit_temperature(lin, val)
    hidden, drop, noise = int(opts.get("hidden", 128)), float(opts.get("drop", 0.3)), float(opts.get("noise", 0))
    v7 = train_mlp(fit, hidden=hidden, drop=drop, noise=noise)
    T7 = fit_temperature(v7, val)
    print(f"v7: hidden {hidden}, drop {drop}, noise {noise}, temperature {T7:.2f}, val {acc(v7, val):.3f}")
    print(f"linear on the same photos: temperature {Tl:.2f}, val {acc(lin, val):.3f}")

    print(f"\nTest photos with no copy anywhere in the training pool: TrashNet {len(novel(tnTe))}, RealWaste {len(novel(rwTe))}, "
          f"TrashBusters {len(novel(tbTe))} (real-world {len(novel(tbReal))}), electronics {len(novel(ewTe))} + {len(novel(kgTe))}")
    table({"live v5": v5, "v6 (PR 37)": v6, "linear, same photos": lin, "v7 neural": v7}, novel, "Only test photos that no head has seen a copy of:")
    table({"linear, same photos": lin, "v7 neural": v7}, lambda s: s, "Every test photo (these two heads saw no copy of any):")

    # The file the app loads. The temperature is folded into the last layer, so the app needs no extra step. The big
    # first layer is stored as whole numbers from -127 to 127 with one scale per hidden unit (base64), which keeps
    # the download small for people on prepaid data.
    r4 = lambda a: np.round(np.asarray(a, dtype=np.float64), 4).tolist()
    rows = v7.W1.T
    scale = np.abs(rows).max(1) / 127
    q = np.clip(np.round(rows / scale[:, None]), -127, 127).astype(np.int8)
    head = {"version": 7, "model": "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX", "classes": CLASSES, "dim": 512,
            "hidden": hidden, "mean": r4(v7.mean), "std": r4(v7.std),
            "W1q": __import__("base64").b64encode(q.tobytes()).decode(), "W1scale": [float(f"{s:.6g}") for s in scale],
            "b1": r4(v7.b1), "W": r4(v7.W2.T / T7), "b": r4(v7.b2 / T7)}

    # Check the stored head gives the same answers as the trained one.
    shipped = MLP(hidden, 0)
    shipped.mean, shipped.std = np.array(head["mean"]), np.array(head["std"])
    shipped.W1 = (q.astype(np.float32) * np.array(head["W1scale"], np.float32)[:, None]).T
    shipped.b1 = np.array(head["b1"], np.float32)
    shipped.W2, shipped.b2 = np.array(head["W"], np.float32).T, np.array(head["b"], np.float32)
    every = tests
    same = (shipped.probs(X(every)).argmax(1) == v7.probs(X(every)).argmax(1)).mean()
    print(f"\nstored head agrees with the trained head on {100 * same:.2f}% of test photos; size {len(json.dumps(head)) / 1024:.0f} KB")
    table({"v7 as stored": shipped}, lambda s: s, "The stored head, every test photo:")

    if "write" in sys.argv:
        out = sys.argv[sys.argv.index("write") + 1]
        Path(out).write_text(json.dumps(head, separators=(",", ":")))
        print("wrote", out)
