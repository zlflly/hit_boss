let waitingInput=null;

let defaultConfig={
	"Up":"W",
	"Left":"A",
	"Down":"S",
	"Right":"D",
	"Jump":"Space",
	"Dash":"Shift",
	"Enter":"Enter",
	"Interact":"E",
	"RotateL":"W",
	"RotateR":"X",
	"HardDrop":"Space"
};

let config_tmp={};

function rebind(name){
	if(waitingInput!==null)waitingInput.children[1].textContent=config_tmp[waitingInput.id];
	waitingInput=document.getElementById(name);
	waitingInput.children[1].textContent='等待输入';
}

function reset(name){
	if(waitingInput!==null){
		waitingInput.children[1].textContent=config_tmp[waitingInput.id];
		waitingInput=null;
	}
	document.getElementById(name).children[1].textContent=defaultConfig[name];
}

function init(){
	let items=document.getElementsByClassName('zhiling');
	let config=JSON.parse(localStorage.getItem('BITeli-config'));
	for(let i of items){
		i.children[1].textContent=config[i.id];
		config_tmp[i.id]=config[i.id];
	}
}

function saveConfig(){
	let items=document.getElementsByClassName('zhiling');
	let config=JSON.parse(localStorage.getItem('BITeli-config'));
	for(let i of items){
		config[i.id]=i.children[1].textContent;
	}
	localStorage.setItem('BITeli-config',JSON.stringify(config));
	window.location.href='../index.html';
}

function keydown(e){
	if(waitingInput!==null){
		e.preventDefault();
		waitingInput.children[1].textContent=KEYMAP[e.keyCode];
		waitingInput=null;
	}
}