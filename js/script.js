const nodesData = [
    { id: 1, x: 350, y: 350 }, { id: 2, x: 580, y: 350 }, { id: 3, x: 810, y: 350 },
    { id: 4, x: 1040, y: 350 }, { id: 5, x: 1270, y: 350 }, { id: 6, x: 1500, y: 350 },
    { id: 7, x: 350, y: 550 }, { id: 8, x: 580, y: 550 }, { id: 9, x: 810, y: 550 },
    { id: 10, x: 1040, y: 550 }, { id: 11, x: 1270, y: 550 }, { id: 12, x: 1500, y: 550 },
    { id: 13, x: 350, y: 780 }, { id: 14, x: 580, y: 780 }, { id: 15, x: 810, y: 780 },
    { id: 16, x: 1040, y: 780 }, { id: 17, x: 1270, y: 780 }, { id: 18, x: 1500, y: 780 }
];

const edgesData = [
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
    [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
    [13, 14], [14, 15], [15, 16], [16, 17], [17, 18],
    [1, 7], [7, 13], [2, 8], [8, 14], [3, 9],
    [9, 15], [4, 10], [10, 16], [5, 11], [11, 17], [6, 12], [12, 18]
];

const adjList = {};
nodesData.forEach(n => adjList[n.id] = []);
edgesData.forEach(e => {
    const n1 = nodesData.find(n => n.id === e[0]);
    const n2 = nodesData.find(n => n.id === e[1]);
    const weight = Math.hypot(n1.x - n2.x, n1.y - n2.y);
    adjList[n1.id].push({ id: n2.id, weight });
    adjList[n2.id].push({ id: n1.id, weight });
});

let graphVisible = false;
let clickPoints = [];
let currentPathEl = null;

const svgLayer = document.getElementById('graph-layer');
const nodesLayer = document.getElementById('nodes-layer');
const edgesLayer = document.getElementById('edges-layer');
const customLayer = document.getElementById('custom-layer');
const appContainer = document.getElementById('app-container');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const clockEl = document.getElementById('clock');

function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

setInterval(updateClock, 1000);
updateClock();

function initGraph() {
    nodesData.forEach(node => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.classList.add('node-group');
        g.dataset.id = node.id;
        g.style.transformOrigin = `${node.x}px ${node.y}px`;
        
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", 22);
        circle.classList.add('node-circle');
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y);
        text.textContent = node.id;
        text.classList.add('node-text');
        
        g.appendChild(circle);
        g.appendChild(text);
        nodesLayer.appendChild(g);
    });
}

function showGraphNodes() {
    if (graphVisible) return;
    graphVisible = true;
    const nodes = document.querySelectorAll('.node-group');
    nodes.forEach((node, index) => {
        setTimeout(() => {
            node.classList.add('visible');
        }, index * 40);
    });
}

svgLayer.addEventListener('click', (e) => {
    const pt = svgLayer.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgLayer.getScreenCTM().inverse());
    
    handleMapClick(svgP.x, svgP.y);
});

function handleMapClick(x, y) {
    if (clickPoints.length === 2) {
        clickPoints = [];
        customLayer.innerHTML = '';
        if (currentPathEl) {
            edgesLayer.removeChild(currentPathEl);
            currentPathEl = null;
        }
        document.querySelectorAll('.node-group').forEach(n => {
            n.classList.remove('path-node');
        });
    }

    clickPoints.push({ x, y });
    drawCustomMarker(x, y, clickPoints.length);

    if (clickPoints.length === 2) {
        calculateAndDrawPath(clickPoints[0], clickPoints[1]);
    }
}

function drawCustomMarker(x, y, step) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 15);
    circle.style.transformOrigin = `${x}px ${y}px`;
    circle.classList.add(step === 1 ? 'marker-start' : 'marker-end');
    customLayer.appendChild(circle);
}

function getNearestNode(x, y) {
    let nearest = null;
    let minDist = Infinity;
    nodesData.forEach(n => {
        const dist = Math.hypot(n.x - x, n.y - y);
        if (dist < minDist) {
            minDist = dist;
            nearest = n;
        }
    });
    return nearest;
}

function calculateAndDrawPath(p1, p2) {
    const startNode = getNearestNode(p1.x, p1.y);
    const endNode = getNearestNode(p2.x, p2.y);

    const dist = {};
    const prev = {};
    const unvisited = new Set();

    nodesData.forEach(n => {
        dist[n.id] = Infinity;
        prev[n.id] = null;
        unvisited.add(n.id);
    });
    dist[startNode.id] = 0;

    while (unvisited.size > 0) {
        let curr = null;
        for (let id of unvisited) {
            if (curr === null || dist[id] < dist[curr]) {
                curr = id;
            }
        }

        if (dist[curr] === Infinity) break;
        unvisited.delete(curr);
        if (curr === endNode.id) break;

        for (let neighbor of adjList[curr]) {
            let alt = dist[curr] + neighbor.weight;
            if (alt < dist[neighbor.id]) {
                dist[neighbor.id] = alt;
                prev[neighbor.id] = curr;
            }
        }
    }

    const path = [];
    let u = endNode.id;
    while (u !== null) {
        path.unshift(u);
        u = prev[u];
    }

    const pointsToAnimate = [{ x: p1.x, y: p1.y }];
    path.forEach(id => {
        const node = nodesData.find(n => n.id === id);
        pointsToAnimate.push({ x: node.x, y: node.y, id: node.id });
    });
    pointsToAnimate.push({ x: p2.x, y: p2.y });

    animatePath(pointsToAnimate);
}

function animatePath(points) {
    let d = "";
    points.forEach((pt, index) => {
        if (index === 0) d += `M ${pt.x} ${pt.y} `;
        else d += `L ${pt.x} ${pt.y} `;
        
        if (pt.id) {
            const nodeEl = document.querySelector(`.node-group[data-id='${pt.id}']`);
            if (nodeEl) nodeEl.classList.add('path-node');
        }
    });

    currentPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    currentPathEl.setAttribute("d", d);
    currentPathEl.classList.add('edge-path');
    edgesLayer.appendChild(currentPathEl);

    const length = currentPathEl.getTotalLength();
    currentPathEl.style.strokeDasharray = length;
    currentPathEl.style.strokeDashoffset = length;
    
    currentPathEl.getBoundingClientRect();
    
    const duration = Math.max(1, length / 400);
    currentPathEl.style.transition = `stroke-dashoffset ${duration}s ease-in-out`;
    currentPathEl.style.strokeDashoffset = "0";
}

function openModal(imgSrc) {
    if (modal.classList.contains('active')) {
        modalImg.classList.remove('active');
        setTimeout(() => {
            modalImg.src = imgSrc;
            modalImg.classList.add('active');
        }, 400);
    } else {
        modalImg.src = imgSrc;
        appContainer.classList.add('blur-background');
        modal.classList.add('active');
        setTimeout(() => {
            modalImg.classList.add('active');
        }, 50);
    }
}

function closeModal() {
    if (modal.classList.contains('active')) {
        modalImg.classList.remove('active');
        modal.classList.remove('active');
        appContainer.classList.remove('blur-background');
        setTimeout(() => {
            modalImg.src = "";
        }, 400);
    }
}

document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case '1': showGraphNodes(); break;
        //case '2': openModal('img/imagen2.png'); break;
        case '3': openModal('img/imagen3.png'); break;
        case '4': openModal('img/imagen4.png'); break;
        case '5': window.location.href = 'html/mini-juego.html'; break;
        case 'Escape': closeModal(); break;
    }
});

window.addEventListener('DOMContentLoaded', initGraph);
