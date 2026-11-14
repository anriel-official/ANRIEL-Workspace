(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const names = ['favorites','applications','notes'];
    function activate(name) {
      for (const n of names) {
        const tab=document.getElementById('tab-'+n),panel=document.getElementById('panel-'+n);
        const selected=n===name;
        tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;panel.hidden=!selected;
      }
    }
    for (const n of names) {
      const tab=document.getElementById('tab-'+n);
      tab.addEventListener('click',()=>activate(n));
      tab.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
        e.preventDefault();const next=names[(names.indexOf(n)+(e.key==='ArrowRight'?1:names.length-1))%names.length];activate(next);document.getElementById('tab-'+next).focus();
      });
    }
  });
})();
