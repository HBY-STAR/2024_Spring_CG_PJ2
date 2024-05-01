// pj2源代码
// 2024 Spring HouBinyang

// 顶点着色器
let VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'varying vec4 v_Color;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'void main() {\n' +
    '  gl_Position = u_ModelMatrix * a_Position;\n' +
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

// 顶点数量
let vertexNum = polygon.length * 4;

// 状态管理
let lineOn = true;
let editOn = true;
let animOn = false;

// 动画相关
let ANGLE_STEP = 45.0;
let currentAngle = 0.0;
let SIZE_STEP = 0.2;
let currentSize = 1.0;
let currentSizeDir = -1.0;
let animationId;
let angle_last_change = Date.now();
let size_last_change = Date.now();
let modelMatrix = new Matrix4();
let recordAngle = 0.0;
let recordSize = 1.0;

function main() {
    // 设置canvas大小
    canvas.width = canvasSize.maxX;
    canvas.height = canvasSize.maxY;

    //初始化事件处理函数
    initMouseEventHandlers();
    initKeyboardEventHandlers();

    // 初始化着色器
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    // 初始化顶点缓冲区
    initVertexBuffers();

    // 设置背景色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    let u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');

    drawAll(u_ModelMatrix);
}

function startAnimation() {
    if (animationId)
        return;


    function animate() {
        currentAngle = computeAngle();
        currentSize = computeSize();

        reDraw()

        animationId = requestAnimationFrame(animate); // 请求下一帧
    }

    animationId = requestAnimationFrame(animate);
}

function stopAnimation() {
    if (!animationId)
        return;

    cancelAnimationFrame(animationId);
    animationId = undefined;
}

function updateVertexPos() {
    for (let i = 0; i < vertex_pos.length; i++) {
        let width = canvasSize.maxX / 2;
        let height = canvasSize.maxY / 2;

        let x = (vertex_pos[i][0] - width) / width;
        let y = -(vertex_pos[i][1] - height) / height;
        let z = 0.0;

        let pos = new Vector4([x, y, z, 1]);
        let newPos = modelMatrix.multiplyVector4(pos);

        vertex_pos[i][0] = newPos.elements[0] * width + width;
        vertex_pos[i][1] = -newPos.elements[1] * height + height;
    }
}


function computeAngle() {
    // 计算时间间隔
    let now = Date.now();
    let elapsed = now - angle_last_change;
    angle_last_change = now;

    // 记录当前角度
    recordAngle = (recordAngle + (ANGLE_STEP * elapsed) / 1000.0) % 360;

    // 计算新的角度
    let newAngle = currentAngle + (ANGLE_STEP * elapsed) / 1000.0;

    return newAngle % 360;
}

function computeSize() {
    // 计算时间间隔
    let now = Date.now();
    let elapsed = now - size_last_change;
    size_last_change = now;

    // 记录当前大小
    recordSize = recordSize + (SIZE_STEP * currentSizeDir * elapsed) / 1000.0;

    // 计算新的大小
    let newSize = currentSize + (SIZE_STEP * currentSizeDir * elapsed) / 1000.0;
    if (recordSize > 1.0 || recordSize < 0.2) {
        currentSizeDir = -currentSizeDir;
    }

    return newSize;
}


function initVertexBuffers() {
    let verticesColors = translateVertexColors();

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
    gl.enableVertexAttribArray(a_Position);

    // 获取a_Color的存储位置，分配缓冲区并开启
    let a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
    gl.enableVertexAttribArray(a_Color);

    // 解绑缓冲区对象
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function drawAll(_u_ModelMatrix) {
    if (!_u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    if (animOn) {
        // 设置模型矩阵
        modelMatrix.setRotate(currentAngle, 0, 0, 1);
        modelMatrix.scale(currentSize, currentSize, 1);
        // 将模型矩阵传给顶点着色器
        gl.uniformMatrix4fv(_u_ModelMatrix, false, modelMatrix.elements);
    } else {
        modelMatrix.setIdentity();
        gl.uniformMatrix4fv(_u_ModelMatrix, false, modelMatrix.elements);
    }


    // 清空缓冲区
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 绘制多边形
    for (let i = 0; i < vertexNum; i += 4) {
        gl.drawArrays(gl.TRIANGLE_FAN, i, 4);
    }

    if (lineOn) {
        // 绘制线框
        for (let i = vertexNum; i < vertexNum * 2; i += 4) {
            gl.drawArrays(gl.LINE_LOOP, i, 4);
            gl.drawArrays(gl.LINE_LOOP, i, 3);
        }
    }

}

function reDraw() {
    initVertexBuffers();

    let u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');

    drawAll(u_ModelMatrix);
}

function initMouseEventHandlers() {
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
            reDraw();
        }
        lastX = x - rect.left;
        lastY = y - rect.top;
    };

}

function initKeyboardEventHandlers() {
    document.onkeydown = function (ev) {
        switch (ev.key) {
            case 'e':
                editOn = !editOn;
                console.log('edit switch: ' + editOn)
                break;
            case 'b':
                lineOn = !lineOn;
                console.log('line switch: ' + lineOn)
                reDraw()
                break;
            case 't':
                animOn = !animOn;
                console.log('anim switch: ' + animOn)
                if (animOn) {
                    angle_last_change = Date.now();
                    size_last_change = Date.now();
                    startAnimation();
                } else {
                    stopAnimation();
                    updateVertexPos();

                    console.log(vertex_pos)
                    currentAngle = 0.0;
                    currentSize = 1.0;
                    modelMatrix.setIdentity();
                }
                break;
            default:
                break;
        }
    }
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

function translateVertexColors() {
    let width = canvasSize.maxX / 2;
    let height = canvasSize.maxY / 2;

    let vertexColors = new Float32Array(vertexNum * 5 * 2);
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

            vertexColors[index + vertexNum * 5] = x;
            vertexColors[index + vertexNum * 5 + 1] = y;
            vertexColors[index + vertexNum * 5 + 2] = 1.0;
            vertexColors[index + vertexNum * 5 + 3] = 0.0;
            vertexColors[index + vertexNum * 5 + 4] = 0.0;
        }
    }
    return vertexColors;
}