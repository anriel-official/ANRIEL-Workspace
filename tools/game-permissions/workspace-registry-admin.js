(() => {
 'use strict';
 const api=window.workspaceRegistry;
 const $=id=>document.getElementById(id);
 const status=document.createElement('p');status.setAttribute('role','status');document.querySelector('main')?.prepend(status);
 const report=(msg,error=false)=>{status.textContent=msg;status.style.color=error?'#b45309':'';};
 async function render(){
  await api.load();
  for(const kind of ['maker','category']){
   const list=$(kind+'-registry-list');if(!list)continue;list.replaceChildren();
   for(const name of api.entries()[kind]){
    const li=document.createElement('li');li.className='registry-item';
    const label=document.createElement('span');label.textContent=name;li.append(label);
    for(const [text,action] of [['編集',async()=>{const next=prompt('新しい名前',name);if(next===null||!next.trim())return;await api.rename(kind,name,next);report('変更しました。');}],['削除',async()=>{if(!confirm('「'+name+'」を登録候補から削除しますか？ 既存のゲーム情報は変更されません。'))return;await api.remove(kind,name);report('削除しました。');}]]){
     const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',async()=>{try{await action();await render();}catch(e){report('操作失敗：'+e.message,true);}});li.append(b);
    }
    list.append(li);
   }
  }
 }
 for(const kind of ['maker','category'])$(kind+'-registry-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const input=$(kind+'-registry-input');const name=input.value.trim();if(!name)return;
  try{await api.ensure(kind,name);input.value='';await render();report('登録しました。');}catch(err){report('登録失敗：'+err.message,true);}
 });
 render().catch(e=>report('登録項目の取得に失敗：'+e.message,true));
})();
