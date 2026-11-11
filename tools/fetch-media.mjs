import sharp from 'sharp'; import fs from 'fs';
const T='?token=exp=1794700800~hmac=';
const B='https://pikaso.cdnpk.net/private/production/';
const items={
 building:'6007617900/render.png'+T+'e204c2dde1fdc7c2be718df57121d85773155e81d371fd2facf73bd2c681a44f',
 light:'6007618245/render.png'+T+'1a1e81f2ec813618009a8058cff4f2ccee9e702116c29e6216fdf05f359365c1',
 textile:'6007618577/render.png'+T+'4f7f2ad488ed56bccc5ec4e594c2d9a2be74f28c32c614c52e5a5a240b711f82',
 models:'6007618405/render.png'+T+'c1516c1b8d25778f6d6c81aa6652e20f73e33ca417b0add2df867b875e7782b4',
 chairs:'6007620243/render.png'+T+'86411c5b9bfb2ebae60e9f9a091d4c44139225247f1884c21b440e5d4bcffbce',
 painting:'6007621866/render.png'+T+'14c7b6fb1d298766b937613a047d92755721e6b8487fb36bb1f157497c514fc1',
 atrium:'6007621420/render.png'+T+'cfac665abeff7e2da135ed8103f755cf7eff8a7a590d898ce1eb74e1eef6e811',
 workshop:'6007622621/render.png'+T+'c3acbe010fadf729eb7b269a1e25784b906d26b1fda1db02f3191c74483cfd1d',
 cafe:'6007625072/render.png'+T+'771179a9a2f241402a3b44febc559c3d014ee90650f1b7210025dfe573bcb16f',
 event:'6007624762/render.png'+T+'c6f28986fc04218503aee5627fc02968af365d352e067b50e0378ba112d13545',
 photo:'6007624841/render.png'+T+'f8276f342028b216165ff29bbd9f5497694d3a61e2f505f7f7aff2562316d802',
 facade:'6007624687/render.png'+T+'2dcabaf5fc0d690b9a5f2bde8a4d2faad6f9932cbee6a383bfdfab850d9341ba',
};
const out='public/media'; const meta={};
await Promise.all(Object.entries(items).map(async([n,u])=>{
  const buf=Buffer.from(await (await fetch(B+u)).arrayBuffer());
  const m=await sharp(buf).metadata();
  const w=Math.min(m.width,1600);
  const info=await sharp(buf).resize({width:w}).webp({quality:78}).toFile(`${out}/${n}.webp`);
  meta[n]={w:info.width,h:info.height}; console.log(n,info.width,info.height,info.size);
}));
fs.writeFileSync('src/data/media.json',JSON.stringify(meta,null,1));
const v=await fetch(process.argv[2]); fs.writeFileSync(`${out}/hero.mp4`,Buffer.from(await v.arrayBuffer())); console.log('video',fs.statSync(`${out}/hero.mp4`).size);
