class Achieve{
	constructor(src,title){
		this.src=src;
		this.title=title;
	}
	async init(){
		let img=await game.dataManager.loadImg(this.src);
		let box=document.createElement("div");
		let achi=document.createElement("div");
		let title=document.createElement("div");
		title.innerHTML="<p>获得成就：<br/>"+this.title+"</p>";
		achi.className="mini-achi";
		img.className="mini-achi-img";
		title.className="mini-achi-title";
		achi.appendChild(img);
		achi.appendChild(title);
		box.appendChild(achi);
		document.getElementById("game").appendChild(box);
		
		box.style["z-index"]=2;
		box.style.position="absolute";
		box.style.left="-320px";
		box.style.top=(window.innerHeight-100)+"px";
		box.style["transition-duration"]="0.3s";
		await delay(300);
		box.style.left="0px";
		await delay(3000);
		box.style.left="-320px";
		await delay(300);
		document.getElementById("game").removeChild(box);
	}
}