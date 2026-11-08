const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(root,'vendor/babel-7.29.0.min.js'),'utf8'),context);
for(const name of ['components','screens','app']){
  const result = context.Babel.transform(fs.readFileSync(path.join(root,name+'.jsx'),'utf8'), {
    presets:['react'], filename:name+'.jsx', comments:false, compact:false
  });
  fs.writeFileSync(path.join(root,name+'.js'),result.code+'\n');
  console.log(name+'.js compiled');
}
