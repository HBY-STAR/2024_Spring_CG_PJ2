// pj2源代码
// 2024 Spring HouBinyang

// 顶点着色器
let VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_Position = a_Position;\n' +
    '  v_Color = a_Color;\n' +
    '}\n';

// 片元着色器
let FSHADER_SOURCE =
    'precision mediump float;\n' +
    'varying vec4 v_Color;\n' +
    'uniform vec4 u_LineColor;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';

// 获取canvas及其上下文
let canvas = document.getElementById("webgl");
let gl = canvas.getContext("webgl");


// 顶点可以拖动的半径
let dragRadius = 10;

// 状态管理
let lineOn = true;
let editOn = true;
let animOn = false;

function main() {
    // 设置canvas大小
    canvas.width = canvasSize.maxX;
    canvas.height = canvasSize.maxY;

    //初始化事件处理函数
    initEventHandlers();

    // 检测WebGL上下文
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
    }

    // 初始化着色器
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
    }

    // 初始化顶点缓冲区
    let n = initVertexBuffers();
    if (n < 0) {
        console.log('Failed to set the positions of the vertices');
    }


    //设置背景颜色，清空画布
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawAll(n);
}

function translateVertexColors() {
    let width = canvasSize.maxX / 2;
    let height = canvasSize.maxY / 2;

    let vertexColors = new Float32Array(polygon.length * 4 * 5); // 4顶点 * 5属性（x, y, r, g, b）
    for (let i = 0; i < polygon.length; i++) {
        for (let j = 0; j < 4; j++) {
            let index = (i * 4 + j) * 5; // 计算当前顶点在数组中的起始索引
            let x = (vertex_pos[polygon[i][j]][0] - width) / width;
            let y = -(vertex_pos[polygon[i][j]][1] - height) / height;
            let r = vertex_color[polygon[i][j]][0] / 255;
            let g = vertex_color[polygon[i][j]][1] / 255;
            let b = vertex_color[polygon[i][j]][2] / 255;
            vertexColors[index] = x;
            vertexColors[index + 1] = y;
            vertexColors[index + 2] = r;
            vertexColors[index + 3] = g;
            vertexColors[index + 4] = b;
        }
    }
    return vertexColors;
}

function initVertexBuffers() {
    let verticesColors = translateVertexColors();
    let n = polygon.length * 4;

    // 创建缓冲区对象
    let vertexColorBuffer = gl.createBuffer();
    if (!vertexColorBuffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    // 将缓冲区对象绑定到目标
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

    // 向缓冲区对象写入数据
    gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

    let FSIZE = verticesColors.BYTES_PER_ELEMENT;

    // 获取a_Position的存储位置，分配缓冲区并开启
    let a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 5, 0);
    gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

    // 获取a_Color的存储位置，分配缓冲区并开启
    let a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
    gl.enableVertexAttribArray(a_Color);  // Enable the assignment of the buffer object

    // 解绑缓冲区对象
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return n;
}


function drawAll(_n) {
    for (let i = 0; i < _n; i += 4) {
        gl.drawArrays(gl.TRIANGLE_FAN, i, 4);
    }
}


function reDraw(_vertex) {
    let reDrawPolygon = [];
    let unchangedPolygon = [];

    //根据顶点索引判断绘制顺序
    for (let i = 0; i < polygon.length; i++) {
        if (polygon[i].includes(_vertex)) {
            reDrawPolygon.push(polygon[i]);
        } else {
            unchangedPolygon.push(polygon[i]);
        }
    }

    // gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // gl.clear(gl.COLOR_BUFFER_BIT);

    //绘制图形
    for (let i = 0; i < unchangedPolygon.length; i++) {
        drawPolygon(unchangedPolygon[i]);
    }
    for (let i = 0; i < reDrawPolygon.length; i++) {
        drawPolygon(reDrawPolygon[i]);
    }
}


function drawPolygon(_polygon) {
    console.log(_polygon);
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
            //记录鼠标位置
            lastX = x - rect.left;
            lastY = y - rect.top;

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
            vertex_pos[vertex][0] = x - rect.left;
            vertex_pos[vertex][1] = y - rect.top;
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