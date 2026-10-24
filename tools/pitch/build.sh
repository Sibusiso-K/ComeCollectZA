#!/bin/bash
# Builds the final pitch video: the recorded voice cut line by line onto the scene timeline, a ducked music bed,
# and the scenes cut on the start of each spoken line. Needs the Whisper timings in voice/transcript.json.
set -e
cd "$TEMP/pitch"
FF=$(python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
LEN=19.6

# 1. Clean the whole take once: remove rumble and hiss, even out the level, bring it up to broadcast loudness.
"$FF" -hide_banner -loglevel error -y -i voice/take.m4a -ac 1 -ar 48000 \
  -af "highpass=f=90,afftdn=nr=14:nf=-45,acompressor=threshold=0.04:ratio=3:attack=5:release=90:makeup=2,loudnorm=I=-15:TP=-1.5:LRA=7" voice/clean.wav

# 2. Cut the seven lines out of the take and place each one on the final timeline. Source times come from the transcript.
# line:  source start, source end, start on the new timeline
python - <<'PY' > voice/lines.txt
import json
t = json.load(open("voice/transcript.json"))
w = [x for s in t for x in s["words"]]
# Lines by their first and last words, in order.
first = ["Reclaimers", "Prices", "Come", "See", "Sell", "Old", "Come"]
last = ["hand.", "guess.", "material.", "nearby.", "recorded.", "too.", "kilo."]
target = [0.40, 3.45, 5.95, 9.18, 10.97, 13.42, 15.16]
i = 0
for k in range(7):
    while w[i]["w"] != first[k]:
        i += 1
    start = w[i]["s"]
    while w[i]["w"] != last[k]:
        i += 1
    end = w[i]["e"]
    print(f"{start:.3f} {end:.3f} {target[k]:.3f}")
    i += 1
PY
cat voice/lines.txt
FILT=""; MIX=""; n=0
while read -r s e t; do
  a=$(python -c "print(round($s-0.10,3))"); b=$(python -c "print(round($e+0.14,3))"); d=$(python -c "print(int(($t-0.10)*1000))")
  FILT+="[0:a]atrim=start=$a:end=$b,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=$(python -c "print(round($b-$a-0.04,3))"):d=0.04,adelay=${d}|${d}[l$n];"
  MIX+="[l$n]"; n=$((n+1))
done < voice/lines.txt
"$FF" -hide_banner -loglevel error -y -i voice/clean.wav -filter_complex "${FILT}${MIX}amix=inputs=7:normalize=0:duration=longest,apad=whole_dur=$LEN,atrim=0:$LEN,aformat=channel_layouts=stereo" voice/voice.wav

# 3. Music, then mix: the music ducks under the voice.
node music3.mjs
"$FF" -hide_banner -loglevel error -y -i voice/voice.wav -i music3.wav -filter_complex \
  "[1:a]volume=0.55[m];[0:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.03:ratio=9:attack=15:release=450:makeup=1[md];[v][md]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=7,atrim=0:$LEN[a]" -map "[a]" -ar 44100 mix.wav

# 4. Scenes. Each segment is centred on its cut, with a 0.3 s cross-fade. Cuts land a little before each line starts.
D=0.3
SEG=("3.35" "2.8" "3.55" "2.05" "2.8" "2.0" "4.85")
NAMES=("1-problem" "2-problem" "3-scan" "4-price" "5-sell" "6-ewaste" "7-end")
mkdir -p seg2
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30"
"$FF" -hide_banner -loglevel error -y -i clips/landfill-1.webm -loop 1 -framerate 30 -i scenes2/1-problem.png -filter_complex "[0:v]trim=0:${SEG[0]},setpts=PTS-STARTPTS,fps=30,scale=1920:1080,setsar=1[bg];[bg][1:v]overlay=0:0:shortest=1,format=yuv420p" -t ${SEG[0]} $ENC -an seg2/s1.mp4
for i in 1 2 3 4 5 6; do
  fr=$(python -c "print(round(${SEG[$i]}*30))")
  "$FF" -hide_banner -loglevel error -y -loop 1 -framerate 30 -i scenes2/${NAMES[$i]}.png -vf "scale=3840:2160,zoompan=z='min(1+0.00045*on,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,setsar=1,format=yuv420p" -frames:v $fr $ENC -an seg2/s$((i+1)).mp4
done
"$FF" -hide_banner -loglevel error -y -i seg2/s1.mp4 -i seg2/s2.mp4 -i seg2/s3.mp4 -i seg2/s4.mp4 -i seg2/s5.mp4 -i seg2/s6.mp4 -i seg2/s7.mp4 -i mix.wav -filter_complex \
 "[0:v][1:v]xfade=transition=fade:duration=$D:offset=3.05[x1];[x1][2:v]xfade=transition=slideleft:duration=$D:offset=5.55[x2];[x2][3:v]xfade=transition=fade:duration=$D:offset=8.80[x3];[x3][4:v]xfade=transition=fade:duration=$D:offset=10.55[x4];[x4][5:v]xfade=transition=fade:duration=$D:offset=13.05[x5];[x5][6:v]xfade=transition=fade:duration=$D:offset=14.75,format=yuv420p[v]" \
 -map "[v]" -map 7:a -t $LEN -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart ComeCollectZA-pitch-final.mp4
ls -la ComeCollectZA-pitch-final.mp4 | awk '{print $5}'
"$FF" -hide_banner -i ComeCollectZA-pitch-final.mp4 2>&1 | grep -E "Duration|Stream"
