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
let lineOn = true;      // 是否显示线框
let editOn = true;      // 是否进入编辑模式
let animOn = false;     // 是否进入动画模式

// 动画相关
let ANGLE_STEP = 45.0;      // 旋转速度
let currentAngle = 0.0;     // 当前旋转角度
let SIZE_STEP = 0.2;        // 缩放速度
let currentSize = 1.0;      // 当前缩放大小
let currentSizeDir = -1.0;  // 缩放方向

let animationId;                                 // 记录动画ID
let angle_last_change = Date.now();     // 记录上次旋转时间
let size_last_change = Date.now();      // 记录上次缩放时间
let modelMatrix = new Matrix4();        // 模型矩阵

/**
 * 主函数
 */
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
    if(initVertexBuffers() < 0) {
        console.log('Failed to set the positions of the vertices');
        return;
    }

    // 设置背景色
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    let u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');

    drawAll(u_ModelMatrix);
}

/**
 * 初始化鼠标事件处理函数
 */
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

/**
 * 初始化键盘事件处理函数
 */
function initKeyboardEventHandlers() {
    document.onkeydown = function (ev) {
        switch (ev.key) {
            case 'e':
                editOn = !editOn;
                if (editOn) {
                    if (animOn) {
                        // 关闭动画
                        animOn = false;
                        stopAnimation();
                        updateVertexPos();
                        modelMatrix.setIdentity();
                    }

                    // 重新绘制
                    reDraw(-currentAngle, 1 / currentSize);

                    // 重置顶点
                    modelMatrix.setIdentity();
                    modelMatrix.rotate(-currentAngle, 0, 0, 1);
                    modelMatrix.scale(1 / currentSize, 1 / currentSize, 1);
                    updateVertexPos();

                    // 重置参数
                    modelMatrix.setIdentity();
                    currentAngle = 0.0;
                    currentSize = 1.0;
                }
                console.log('edit switch: ' + editOn)
                break;
            case 'b':
                lineOn = !lineOn;
                // 重新绘制
                reDraw()

                console.log('line switch: ' + lineOn)
                break;
            case 't':
                animOn = !animOn;

                if (animOn) {
                    // 开启动画
                    editOn = false;
                    angle_last_change = Date.now();
                    size_last_change = Date.now();
                    startAnimation();
                } else {
                    // 关闭动画
                    stopAnimation();
                    updateVertexPos();
                    modelMatrix.setIdentity();
                    console.log(vertex_pos);
                }

                console.log('anim switch: ' + animOn)
                break;
            default:
                console.log('Invalid key: ' + ev.key);
                break;
        }
    }
}


/**
 * 初始化顶点缓冲区
 * @returns {number}
 */
function initVertexBuffers() {
    let verticesColors = translateVertexColors();

    // 创建缓冲区对象
    let vertexColorBuffer = gl.createBuffer();
    if (!vertexColorBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
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

/**
 * 绘制多边形及线框
 * @param _u_ModelMatrix
 * @param _rotate
 * @param _scale
 */
function drawAll(_u_ModelMatrix, _rotate = 0.0, _scale = 1.0) {
    if (!_u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    // 设置模型矩阵
    modelMatrix.rotate(_rotate, 0, 0, 1);
    modelMatrix.scale(_scale, _scale, 1);
    // 将模型矩阵传给顶点着色器
    gl.uniformMatrix4fv(_u_ModelMatrix, false, modelMatrix.elements);


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

/**
 * 重新绘制所有图形
 * @param _rotate
 * @param _scale
 */
function reDraw(_rotate = 0.0, _scale = 1.0) {
    initVertexBuffers();
    let u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    drawAll(u_ModelMatrix, _rotate, _scale);
}

/**
 * 将顶点坐标和颜色转换为WebGL坐标系
 * @returns {Float32Array}
 */
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
            // 存放顶点坐标和颜色信息，用于绘制多边形
            vertexColors[index] = x;
            vertexColors[index + 1] = y;
            vertexColors[index + 2] = r;
            vertexColors[index + 3] = g;
            vertexColors[index + 4] = b;

            // 存放顶点坐标，颜色设为红色，用于绘制线框
            vertexColors[index + vertexNum * 5] = x;
            vertexColors[index + vertexNum * 5 + 1] = y;
            vertexColors[index + vertexNum * 5 + 2] = 1.0;
            vertexColors[index + vertexNum * 5 + 3] = 0.0;
            vertexColors[index + vertexNum * 5 + 4] = 0.0;
        }
    }
    return vertexColors;
}


/**
 * 更新顶点位置
 */
function updateVertexPos() {
    for (let i = 0; i < vertex_pos.length; i++) {
        let width = canvasSize.maxX / 2;
        let height = canvasSize.maxY / 2;

        // 将顶点坐标转换为WebGL坐标系
        let x = (vertex_pos[i][0] - width) / width;
        let y = -(vertex_pos[i][1] - height) / height;
        let z = 0.0;

        // 计算新的顶点坐标
        let pos = new Vector4([x, y, z, 1]);
        let newPos = modelMatrix.multiplyVector4(pos);

        // 更新顶点坐标
        vertex_pos[i][0] = newPos.elements[0] * width + width;
        vertex_pos[i][1] = -newPos.elements[1] * height + height;
    }
}


/**
 * 开启动画
 */
function startAnimation() {
    if (animationId)
        return;

    function animate() {
        reDraw(computeRotate(), computeScale());
        animationId = requestAnimationFrame(animate); // 请求下一帧
    }

    animationId = requestAnimationFrame(animate);
}

/**
 * 关闭动画
 */
function stopAnimation() {
    if (!animationId)
        return;

    cancelAnimationFrame(animationId);
    animationId = undefined;
}


/**
 * 计算旋转角度
 * @returns {number}
 */
function computeRotate() {
    // 计算时间间隔
    let now = Date.now();
    let elapsed = now - angle_last_change;
    angle_last_change = now;

    // 计算旋转角度
    let rotate = (ANGLE_STEP * elapsed) / 1000.0;

    // 计算新的角度
    currentAngle = (currentAngle + rotate) % 360;

    return rotate;
}

/**
 * 计算缩放大小
 * @returns {number}
 */
function computeScale() {
    // 计算时间间隔
    let now = Date.now();
    let elapsed = now - size_last_change;
    size_last_change = now;

    // 计算缩放大小
    let curScale = currentSize;
    let scale = (SIZE_STEP * currentSizeDir * elapsed) / 1000.0;
    let ret = (curScale + scale) / curScale;

    // 计算新的大小
    currentSize = currentSize * ret;
    if (currentSize > 1.0 || currentSize < 0.2) {
        currentSizeDir = -currentSizeDir;
    }

    return ret;
}

/**
 * 判断鼠标是否在顶点附近
 * @param _x
 * @param _y
 * @returns {number}
 */
function canDrag(_x, _y) {
    for (let i = 0; i < vertex_pos.length; i++) {
        if ((vertex_pos[i][0] - _x) * (vertex_pos[i][0] - _x) + (vertex_pos[i][1] - _y) * (vertex_pos[i][1] - _y) < dragRadius * dragRadius) {
            return i;
        }
    }
    return -1;
}

