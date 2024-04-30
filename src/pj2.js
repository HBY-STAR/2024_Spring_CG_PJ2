// pj2源代码
// 2024 Spring HouBinyang

// 获取canvas及其上下文
let canvas = document.getElementById("webgl");
let ctx = canvas.getContext("webgl");

// 可以拖动的半径
let dragRadius = 10;

function main() {
    // 设置canvas大小
    canvas.width = canvasSize.maxX;
    canvas.height = canvasSize.maxY;

    //初始化事件处理函数
    initEventHandlers();

    //第一次绘制图形
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawAll();
}

function drawAll() {
    //绘制多边形
    for (let i = 0; i < polygon.length; i++) {
        drawPolygon(polygon[i]);
    }
}


function reDraw(_vertex) {
    let reDrawPolygon = [];
    let unchangedPolygon = [];

    //根据顶点索引判断绘制顺序
    for (let i = 0; i < polygon.length; i++) {
        if (polygon[i].includes(_vertex)) {
            reDrawPolygon.push(polygon[i]);
        }else {
            unchangedPolygon.push(polygon[i]);
        }
    }

    //清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //设置背景为黑色
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //绘制图形
    for(let i = 0; i < unchangedPolygon.length; i++) {
        drawPolygon(ctx, vertex_pos, unchangedPolygon[i], vertex_color[unchangedPolygon[i][0]]);
    }
    for (let i = 0; i < reDrawPolygon.length; i++) {
        drawPolygon(ctx, vertex_pos, reDrawPolygon[i], vertex_color[reDrawPolygon[i][0]]);
    }
}


function drawPolygon(_polygon) {
    // Todo
}


function initEventHandlers() {
    let dragging = false;               //是否可以拖动
    let vertex = -1;                    //拖动的顶点
    let lastX = -1, lastY = -1; //记录上一次鼠标位置

    canvas.onmousedown = function (ev) {
        let x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();

        //判断鼠标是否在canvas内
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            //记录鼠标位置，已修正为canvas内坐标
            // lastX = x - rect.left;
            // lastY = y - rect.top;

            //判断鼠标是否在顶点附近
            vertex = canDrag(lastX, lastY);
            if (vertex !== -1) {
                dragging = true;
            }
        }
    };

    canvas.onmouseup = function () {
        dragging = false;
    };

    canvas.onmousemove = function (ev) {
        let x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();

        //是否可以拖动
        if (dragging) {
            // vertex_pos[vertex][0] = x - rect.left;
            // vertex_pos[vertex][1] = y - rect.top;
            //重新绘制
            reDraw(vertex);
        }
        // lastX = x - rect.left;
        // lastY = y - rect.top;
    };
}

function canDrag(_x, _y) {
    //遍历所有顶点
    for (let i = 0; i < vertex_pos.length; i++) {
        if ((vertex_pos[i][0] - _x) * (vertex_pos[i][0] - _x) + (vertex_pos[i][1] - _y) * (vertex_pos[i][1] - _y) < dragRadius * dragRadius) {
            return i;
        }
    }
    return -1;
}