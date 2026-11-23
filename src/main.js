import './ui/styles.css';
import {App} from './app/App.js';
import { registerOfflineApp } from './pwa/register.js';
let app;
try{app=new App();}catch(error){console.error('Lamsat Oman initialization failed:',error);const viewport=document.querySelector('#viewport');if(viewport)viewport.innerHTML='<p role="alert" style="padding:30px">تعذّر بدء المعرض. أعد تحميل الصفحة، وتأكد من دعم WebGL.</p>';}
if(import.meta.hot)import.meta.hot.dispose(()=>app?.dispose());
if (app) registerOfflineApp();
