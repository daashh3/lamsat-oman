export function pulseLight(light,time,{base=1.8,amount=.35,reduced=false}={}){light.intensity=base+(reduced?0:Math.sin(time*1.7)*amount);}
