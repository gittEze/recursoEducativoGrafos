const places = {
	escuela: { id: 'escuela', icon: '🏫', label: 'Escuela', x: 20, y: 25 },
	cancha: { id: 'cancha', icon: '⚽', label: 'Cancha', x: 50, y: 15 },
	hospital: { id: 'hospital', icon: '🏥', label: 'Hospital', x: 80, y: 25 },
	biblioteca: { id: 'biblioteca', icon: '📚', label: 'Biblioteca', x: 35, y: 40 },
	tienda: { id: 'tienda', icon: '🏪', label: 'Tienda', x: 20, y: 55 },
	plaza: { id: 'plaza', icon: '🌳', label: 'Plaza', x: 50, y: 50 },
	restaurante: { id: 'restaurante', icon: '🍽️', label: 'Restaurante', x: 80, y: 55 },
	estacion: { id: 'estacion', icon: '🚉', label: 'Estación', x: 20, y: 85 },
	casa: { id: 'casa', icon: '🏠', label: 'Casa', x: 50, y: 80 },
	banco: { id: 'banco', icon: '🏦', label: 'Banco', x: 80, y: 85 }
};

const levels = [
	{ task: "Viaje directo: Salí de casa y ve hasta la plaza para caminar un rato.", expected: ["casa-plaza"] },
	{ task: "Ruta de trámites: Ve al hospital a comer en el restaurante y luego ve a sacar un préstamo en el banco.", expected: ["hospital-restaurante", "restaurante-banco"] },
	{ task: "Ruta matutina: Desde la escuela, pasá por la tienda y termina tu recorrido en la estación.", expected: ["escuela-tienda", "tienda-estacion"] },
	{ task: "Recorrido de estudio: Salí de casa hacia la plaza, luego andá a la biblioteca y finalmente a la escuela.", expected: ["casa-plaza", "plaza-biblioteca", "biblioteca-escuela"] },
	{ task: "Fin de semana: Después del partido en la cancha, cruzá por la plaza y luego ve a cenar al restaurante.", expected: ["cancha-plaza", "plaza-restaurante"] },
	{ task: "Ruta vecinal: Llegá a la estación, pasá por tu casa a buscar unos documentos y llevalos al banco.", expected: ["estacion-casa", "casa-banco"] },
	{ task: "Día agitado: Hacé las compras en la tienda, cruzá la plaza, retirá dinero en el banco y visitá a un amigo en el hospital.", expected: ["tienda-plaza", "plaza-banco", "banco-hospital"] },
	{ task: "Paseo por el norte: Salí de la escuela, sacá un libro en la biblioteca, mirá el partido en la cancha y andá al hospital.", expected: ["escuela-biblioteca", "biblioteca-cancha", "cancha-hospital"] },
	{ task: "Transporte local: Desde la estación, pasá por la tienda, descansá en la plaza y terminá en la cancha.", expected: ["estacion-tienda", "tienda-plaza", "plaza-cancha"] },
	{ task: "Múltiples destinos: Desde tu casa tenés que visitar la estación, el banco y la plaza en recorridos directos separados.", expected: ["casa-estacion", "casa-banco", "casa-plaza"] }
];

let currentLevel = 0;
let score = 0;
let selectedNode = null;
let edges = [];
let navigating = false;
let waitingForSpace = false;

const screens = {
	start: document.getElementById('screen-start'),
	game: document.getElementById('screen-game'),
	waypoint: document.getElementById('screen-waypoint'),
	end: document.getElementById('screen-end')
};

const dom = {
	clockDisplay: document.getElementById('clock-display'),
	startBtn: document.getElementById('btn-start'),
	resetBtn: document.getElementById('btn-reset'),
	undoBtn: document.getElementById('btn-undo'),
	checkBtn: document.getElementById('btn-check'),
	playAgainBtn: document.getElementById('btn-play-again'),
	scoreDisplay: document.getElementById('score-display'),
	levelDisplay: document.getElementById('level-display'),
	taskText: document.getElementById('task-text'),
	feedbackText: document.getElementById('feedback-text'),
	nodesLayer: document.getElementById('nodes-layer'),
	svgLayer: document.getElementById('svg-layer'),
	waypointTotalScore: document.getElementById('waypoint-total-score'),
	finalScoreDisplay: document.getElementById('final-score-display')
};

function updateClock() {
	const now = new Date();
	dom.clockDisplay.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function init() {
	updateClock();
	setInterval(updateClock, 1000);
	const savedTheme = localStorage.getItem('cc_theme');
	if (savedTheme === 'light') {
		document.body.classList.remove('dark-mode');
	} else {
		document.body.classList.add('dark-mode');
	}
	const savedLvl = localStorage.getItem('cc_level');
	const savedScore = localStorage.getItem('cc_score');
	if (savedLvl !== null && savedScore !== null) {
		currentLevel = parseInt(savedLvl, 10);
		score = parseInt(savedScore, 10);
	}
	dom.startBtn.addEventListener('click', () => {
		if (currentLevel >= levels.length) resetData();
		startGame();
	});
	dom.resetBtn.addEventListener('click', () => {
		resetData();
		showScreen('start');
	});
	dom.undoBtn.addEventListener('click', undoEdge);
	dom.checkBtn.addEventListener('click', checkAnswer);
	dom.playAgainBtn.addEventListener('click', () => {
		resetData();
		showScreen('start');
	});
	window.addEventListener('keydown', (e) => {
		if (e.key === 'o' || e.key === 'O') {
			document.body.classList.add('dark-mode');
			localStorage.setItem('cc_theme', 'dark');
		} else if (e.key === 'p' || e.key === 'P') {
			document.body.classList.remove('dark-mode');
			localStorage.setItem('cc_theme', 'light');
		} else if (e.code === 'Space' && waitingForSpace) {
			e.preventDefault();
			loadNextLevel();
		} else if (e.key === '5') {
			window.location.href = '../index.html';
		}
	});
	renderNodes();
}

function resetData() {
	currentLevel = 0;
	score = 0;
	waitingForSpace = false;
	localStorage.removeItem('cc_level');
	localStorage.removeItem('cc_score');
}

function showScreen(screenName) {
	Object.values(screens).forEach(s => s.classList.remove('active'));
	void screens[screenName].offsetWidth;
	screens[screenName].classList.add('active');
}

function startGame() {
	waitingForSpace = false;
	showScreen('game');
	loadLevel();
}

function loadLevel() {
	edges = [];
	selectedNode = null;
	navigating = false;
	waitingForSpace = false;
	dom.feedbackText.textContent = '';
	dom.feedbackText.style.color = '';
	dom.svgLayer.innerHTML = '';
	dom.scoreDisplay.textContent = score;
	dom.levelDisplay.textContent = currentLevel + 1;
	dom.taskText.textContent = levels[currentLevel].task;
	dom.undoBtn.disabled = false;
	dom.checkBtn.disabled = false;
	document.querySelectorAll('.node').forEach(n => {
		n.classList.remove('selected');
		n.style.pointerEvents = 'auto';
	});
}

function renderNodes() {
	dom.nodesLayer.innerHTML = '';
	Object.values(places).forEach(place => {
		const div = document.createElement('div');
		div.className = 'node';
		div.id = `node-${place.id}`;
		div.style.left = `${place.x}%`;
		div.style.top = `${place.y}%`;
		div.innerHTML = `
			<div class="icon-box">${place.icon}</div>
			<div class="node-label">${place.label}</div>
		`;
		div.addEventListener('click', () => handleNodeClick(place.id));
		dom.nodesLayer.appendChild(div);
	});
}

function handleNodeClick(id) {
	if (navigating) return;
	dom.feedbackText.textContent = '';
	if (selectedNode === null) {
		selectedNode = id;
		document.getElementById(`node-${id}`).classList.add('selected');
	} else if (selectedNode === id) {
		document.getElementById(`node-${id}`).classList.remove('selected');
		selectedNode = null;
	} else {
		const edgeExists = edges.some(e => 
			(e.from === selectedNode && e.to === id) || 
			(e.from === id && e.to === selectedNode)
		);
		if (!edgeExists) {
			edges.push({ from: selectedNode, to: id });
			drawEdges();
		}
		document.getElementById(`node-${selectedNode}`).classList.remove('selected');
		selectedNode = null;
	}
}

function drawEdges() {
	dom.svgLayer.innerHTML = '';
	edges.forEach(edge => {
		const p1 = places[edge.from];
		const p2 = places[edge.to];
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', `${p1.x}%`);
		line.setAttribute('y1', `${p1.y}%`);
		line.setAttribute('x2', `${p2.x}%`);
		line.setAttribute('y2', `${p2.y}%`);
		dom.svgLayer.appendChild(line);
	});
}

function undoEdge() {
	if (navigating) return;
	if (edges.length > 0) {
		edges.pop();
		drawEdges();
		dom.feedbackText.textContent = '';
	}
}

function checkAnswer() {
	if (navigating) return;
	const expected = levels[currentLevel].expected;
	let extra = 0;
	edges.forEach(e => {
		const str = `${e.from}-${e.to}`;
		const revStr = `${e.to}-${e.from}`;
		if (!expected.includes(str) && !expected.includes(revStr)) {
			extra++;
		}
	});
	dom.feedbackText.style.color = 'var(--error-color)';
	if (extra > 0) {
		dom.feedbackText.textContent = "Error de ruta: Hay un desvío que no estaba programado.";
		return;
	}
	if (edges.length < expected.length) {
		dom.feedbackText.textContent = "Destino inalcanzable: Faltan tramos en tu ruta.";
		return;
	}
	triggerSuccess();
}

function triggerSuccess() {
	navigating = true;
	score += 100;
	dom.feedbackText.style.color = 'var(--success-color)';
	dom.feedbackText.textContent = "📍 Ruta confirmada. Guardando progreso...";
	const lines = dom.svgLayer.querySelectorAll('line');
	lines.forEach(line => line.classList.add('success-route'));
	document.querySelectorAll('.node').forEach(n => {
		n.classList.remove('selected');
		n.style.pointerEvents = 'none';
	});
	dom.undoBtn.disabled = true;
	dom.checkBtn.disabled = true;
	setTimeout(() => {
		currentLevel++;
		localStorage.setItem('cc_level', currentLevel);
		localStorage.setItem('cc_score', score);
		if (currentLevel >= levels.length) {
			dom.finalScoreDisplay.textContent = score;
			showScreen('end');
		} else {
			dom.waypointTotalScore.textContent = score;
			showScreen('waypoint');
			waitingForSpace = true;
		}
	}, 1500);
}

function loadNextLevel() {
	waitingForSpace = false;
	showScreen('game');
	loadLevel();
}

window.addEventListener('DOMContentLoaded', init);