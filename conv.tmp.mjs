import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const [raw,out]=process.argv.slice(2);
for(const f of fs.readdirSync(raw)){ const n=path.parse(f).name;
  const img=sharp(path.join(raw,f)); const m=await img.metadata();
  await img.resize({width:Math.min(m.width,1800)}).webp({quality:80}).toFile(path.join(out,n+'.webp'));
  await sharp(path.join(raw,f)).resize({width:1280}).jpeg({quality:78}).toFile(path.join(out,n+'.jpg'));
  console.log(n,m.width,m.height); }
