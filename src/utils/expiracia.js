export const formatExp=(d)=>d?`${d.split('-')[1]}/${d.split('-')[0]}`:'';
export const stav=(e)=>{const D=new Date();D.setHours(0,0,0,0);const E=new Date(e);E.setHours(0,0,0,0);
const diff=(E-D)/(1000*60*60*24);return diff<0?'expirovane':diff<=60?'blizko':'ok'};