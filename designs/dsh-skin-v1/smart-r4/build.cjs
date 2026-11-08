const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const babel={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../vendor/babel-7.29.0.min.js'),'utf8'),babel);
const result=babel.Babel.transform(fs.readFileSync(path.join(__dirname,'app.jsx'),'utf8'),{presets:['react'],filename:'app.jsx',comments:false,compact:false});
fs.writeFileSync(path.join(__dirname,'app.js'),result.code+'\n');
console.log('R4 app compiled');
