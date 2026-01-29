import {useState} from 'react';import {useNavigate} from 'react-router-dom';import {signIn,signUp} from '../app/auth';
export default function Login(){const[e,setE]=useState('');const[p,setP]=useState('');const[m,setM]=useState('login');const[msg,setMsg]=useState('');const nav=useNavigate();
const s=async(ev)=>{ev.preventDefault();setMsg('');try{if(m==='login'){const{error}=await signIn(e,p);if(error)throw error;nav('/');}
else{const{error}=await signUp(e,p);if(error)throw error;setMsg('Registrácia hotová.');}}catch(x){setMsg(x.message)}}
return(<div className="max-w-md mx-auto p-4"><h1 className="text-xl font-bold mb-3">{m==='login'?'Prihlásenie':'Registrácia'}</h1>
<form onSubmit={s} className="space-y-3"><input className="w-full border rounded-xl px-3 py-2" placeholder="Email" value={e} onChange={x=>setE(x.target.value)}/>
<input type="password" className="w-full border rounded-xl px-3 py-2" placeholder="Heslo" value={p} onChange={x=>setP(x.target.value)}/>
{msg&&<div className="text-sm border rounded-xl p-2">{msg}</div>}<button className="w-full border rounded-xl py-2 font-semibold">OK</button></form>
<div className="mt-3 text-sm"><button className="underline" onClick={()=>setM(m==='login'?'signup':'login')}>Prepnúť</button></div></div>)}
