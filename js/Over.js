async function over(){
	await game.mapManager.fadeOut();
	let audio=document.getElementById('audio');
	for(let i=49;i>=0;i--){
		audio.volume=i/50;
		await delay(20);
	}
	audio.pause();
	await delay(500);
	document.getElementById('text-container').style.color="red";
	await game.dialog.prints([
		"压抑的空气怒号着席卷而来",
		"无形的幻觉封住了你的感知",
		"你大声呼救",
		"但是谁也没有来",
		"你迷失了"
	]);
	game.eventManager.set({"type":"achieve","src":"img/achi/wither.png","title":"无尽虚空","id":"bad_end"});
	await game.eventManager.handle();
	await delay(1000);
}

async function end(){
	let user=localStorage.getItem('BITeli-username')||'default';
	let achi=JSON.parse(localStorage.getItem('BITeli-achi-'+user));
	if(game.saveManager.hasFlag('over')||!achi.snake1||!achi.tetris1){
		game.eventManager.set({
			"next":[
				{
					"type":"dialog",
					"text":[
						"【赵老师】同学们，小学期结束了，相信这三周的时间对大家来说一定格外难忘",
						"【赵老师】尤其你们这一届，给了我大量的惊喜",
						"【赵老师】不仅每一组都对项目投入了大量的热爱与心血",
						"【赵老师】在成品的质量上比起往届也有所突破",
						"【赵老师】恭喜你们！",
						"周围变得喧嚣了起来，教室内充满了快活的气息",
						"然而少女却有自己的心事",
						"【诺艾尔】项目结束了，但我真的做到最好了吗",
						"【诺艾尔】这段时间里，我曾坠落到无边的黑暗中，体验过最无助的情绪",
						"【诺艾尔】曾努力去做我想做的事，但得到的结果却与投入的热情不成正比",
						"【诺艾尔】我是不是，做得不够好",
						"【赵老师】诺艾尔",
						"【诺艾尔】！",
						"不知不觉，老师来到了少女身边",
						"【赵老师】我听见你说的了",
						"【赵老师】或许你会因为结果不尽如人意而自卑",
						"【赵老师】哪怕你经历过失落，哪怕你感到目标遥不可及",
						"【赵老师】可你最终还是来到了这里",
						"【赵老师】你有同伴的帮助，有对理想的热爱，和坚韧的心",
						"【赵老师】你还觉得自己不够好，不应当享有快乐吗？",
						"【诺艾尔】......",
						"【诺艾尔】谢谢老师，我明白了"
					]
				},
				{"type":"fadeOut"},
				{"type":"delay","time":600},
				{"type":"showCG","src":"img/cg/2-2.jpg"},
				{"type":"delay","time":600},
				{
					"type":"dialog",
					"text":[
						"如今，幻觉依然困扰着少女",
						"可就如以往一样，过去她能击败困难，未来同样也能",
						"更何况，从此时此刻起，少女多了同伴，多了生活的目标",
						"她的热爱、坚韧与友情帮助她前进",
						"少女已经不再迷茫"
					]
				},
				{"type":"fadeOut"},
				{"type":"achieve","src":"img/achi/heart.png","title":"普通玩家","id":"normal_end"},
				{"type":"delay","time":1000}
			]
		});
		while(game.eventManager.event){
			await game.eventManager.handle();
		}
	}else{
		game.eventManager.set({
			"next":[
				{
					"type":"dialog",
					"text":[
						"【赵老师】同学们，小学期结束了，相信这三周的时间对大家来说一定格外难忘",
						"【赵老师】尤其你们这一届，给了我大量的惊喜",
						"【赵老师】不仅每一组都对项目投入了大量的热爱与心血",
						"【赵老师】在成品的质量上比起往届也有所突破",
						"【赵老师】恭喜你们！",
						"周围变得喧嚣了起来，教室内充满了快活的气息",
						"【同学】诺艾尔，你真的太厉害了",
						"【同学】没有你，我们组的成绩至少要减半",
						"【诺艾尔】谢谢你们，但没有你们，我无法做到这些",
						"【诺艾尔】当我刚萌发出做游戏的想法时",
						"【诺艾尔】我一直被内心束缚不敢去做我想做的事",
						"【诺艾尔】是你们的帮助让我走出这一步",
						"【诺艾尔】谢谢你们！"
					]
				},
				{"type":"fadeOut"},
				{"type":"delay","time":600},
				{"type":"showCG","src":"img/cg/1-2.jpg"},
				{"type":"delay","time":600},
				{
					"type":"dialog",
					"text":[
						"如今，幻觉已经不再困扰少女",
						"这段时间内她所做到的远超出她的想象",
						"相比以前，她不再迷茫，不再恐惧",
						"她已经发现了自己的热爱，和实现自身热爱的能力",
						"她内心的懦弱随着幻觉一并消散",
						"留下的是一颗坚韧不拔，无比纯粹的内心"
					]
				},
				{"type":"fadeOut"},
				{"type":"achieve","src":"img/achi/eternal.png","title":"真玩家","id":"true_end"},
				{"type":"delay","time":1000}
			]
		});
		while(game.eventManager.event){
			await game.eventManager.handle();
		}
		let video=document.createElement('video');
		document.body.appendChild(video);
		video.style.position='absolute';
		video.style.width='90%';
		video.style.height='90%';
		video.style.margin='0 auto';
		video.style.inset=0;
		video.src='ed/staff.mp4';
		video.play();
		await new Promise(resolve=>{
			video.addEventListener('ended',resolve);
		});
	}
}