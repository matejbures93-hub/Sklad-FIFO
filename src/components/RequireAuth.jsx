import {useEffect,useState} from 'react';import {Navigate} from 'react-router-dom';import {getSession} from '../app/auth';
export default function RequireAuth({children}){const[l,setL]=useState(true);const[s,setS]=useState(null);
useEffect(()=>{getSession().then(x=>{setS(x);setL(false)})},[]);if(l)return <div className="p-4">Načítavam…</div>;
if(!s)return <Navigate to="/login" replace/>;return children;}