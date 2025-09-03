class Dialog{
	constructor(){
		this.createDialog();
		this.buffer=[];
		this.canceled=false;
	}
	createDialog(){
		let dialog=document.createElement("div");
		let textContainer=document.createElement("div");
		let name=document.createElement("span");
		let text=document.createElement("p");
		
		dialog.id="dialog";
		dialog.style.display="none";
		textContainer.id="text-container";
		name.id="name";
		text.id="text";
		
		dialog.appendChild(textContainer);
		textContainer.appendChild(name);
		textContainer.appendChild(text);
		document.getElementById("game").appendChild(dialog);
		
		this.dialog=dialog;
		this.name=name;
		this.text=text;
	}
	async open(){
		this.dialog.style.display="block";
		for(let i=1;i<=5;i++){
			this.dialog.style.height=i*i+"%";
			await delay(20);
		}
	}
	async close(){
		for(let i=4;i>=0;i--){
			this.dialog.style.height=i*i+"%";
			await delay(20);
		}
		this.dialog.style.display="none";
	}
	async prints(texts){
		this.canceled=false;
		this.buffer.push(...texts);
		await this.open();
		await this._prints();
		await this.close();
	}
	async _prints(){
		while(true){
			if(this.buffer.length==0)return;
			
			let text=this.buffer.shift();
			if(text[0]=="【"){
				let end=text.indexOf("】");
				this.name.textContent=text.slice(0,end+1);
				text=text.slice(end+1);
			}
			
			let enter;
			for(let i of text.split("")){
				let span=document.createElement("span");
				span.textContent=i;
				this.text.appendChild(span);
				if(!enter)enter=game.inputManager.takeEnter();
				if(enter)continue;
				await delay(50);
				if(this.canceled)return;
			}
			
			let waitInput=Promise.race([
				game.inputManager.waitEnter(),
				new Promise(resolve=>{
					this._cancel=resolve;
				})
			]);
			await waitInput;
			if(this.canceled)return;
			game.inputManager.takeEnter()
			this.name.innerHTML="";
			this.text.innerHTML="";
		}
	}
	cancel(){
		this.canceled=true;
		if(this._cancel){
			this._cancel();
			this._cancel=null;
		}
		this.buffer=[];
		this.name.innerHTML="";
		this.text.innerHTML="";
	}
}