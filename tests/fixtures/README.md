# fixtures

`Sora-400-subset.ttf` is [Sora](https://fonts.google.com/specimen/Sora) by Jonny
Pinhorn, instanced at weight 400 and cut down to ASCII plus a handful of
codepoints above U+20FF. Those few are what let the tests split it: the default
always-included ranges keep all of Latin in the common tier, so a Latin-only
font would have nothing left to defer.

Sora is licensed under the SIL Open Font License 1.1; `OFL.txt` is its licence
text. Rebuild the subset with:

```sh
curl -sL -o "/tmp/Sora[wght].ttf" \
  "https://github.com/google/fonts/raw/main/ofl/sora/Sora%5Bwght%5D.ttf"
fonttools varLib.instancer "/tmp/Sora[wght].ttf" wght=400 -o /tmp/sora400.ttf

pyftsubset /tmp/sora400.ttf \
  --unicodes="U+0020-007E,U+2122,U+2212,U+2264,U+FB01" \
  --output-file=tests/fixtures/Sora-400-subset.ttf \
  --no-hinting --desubroutinize --layout-features=''
```
