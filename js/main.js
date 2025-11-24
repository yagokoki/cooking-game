// Vertex shader source code
const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec3 a_color;

    uniform mat4 u_modelMatrix;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_projectionMatrix;
    uniform mat4 u_normalMatrix;

    varying vec3 v_color;
    varying vec3 v_normal;
    varying vec3 v_position;

    void main() {
        vec4 worldPosition = u_modelMatrix * vec4(a_position, 1.0);
        v_position = worldPosition.xyz;
        v_normal = mat3(u_normalMatrix) * a_normal;
        v_color = a_color;

        gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
    }
`;

// Fragment shader source code
const fragmentShaderSource = `
    precision mediump float;

    varying vec3 v_color;
    varying vec3 v_normal;
    varying vec3 v_position;

    uniform vec3 u_lightPosition;
    uniform vec3 u_cameraPosition;

    void main() {
        vec3 normal = normalize(v_normal);
        vec3 lightDir = normalize(u_lightPosition - v_position);

        float ambient = 0.3;
        float diff = max(dot(normal, lightDir), 0.0);

        vec3 finalColor = v_color * (ambient + diff * 0.7);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Erro ao compilar shader:', gl.getShaderInfoLog(shader));
        return null;
    }
    
    return shader;
}

function createProgram(gl, vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Erro ao linkar programa:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    
    return program;
}

function configBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
}

function drawModel(gl, program, loc, modelo, modelMatrix) {
    // Configurar buffer de vértices
    gl.bindBuffer(gl.ARRAY_BUFFER, modelo.vertexBuffer);
    gl.enableVertexAttribArray(loc.position);
    gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0);
    
    // Configurar buffer de normais
    gl.bindBuffer(gl.ARRAY_BUFFER, modelo.normalBuffer);
    gl.enableVertexAttribArray(loc.normal);
    gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0);
    
    // Configurar buffer de cores do MTL
    gl.bindBuffer(gl.ARRAY_BUFFER, modelo.colorBuffer);
    gl.enableVertexAttribArray(loc.color);
    gl.vertexAttribPointer(loc.color, 3, gl.FLOAT, false, 0, 0);

    // Calcular matriz normal (inversa transposta da modelMatrix)
    const normalMatrix = m4.transpose(modelMatrix);

    gl.uniformMatrix4fv(loc.modelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(loc.normalMatrix, false, normalMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, modelo.numVertices);
}

async function main() {
    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl');
    
    if (!gl) {
        console.error('WebGL não suportado');
        return;
    }
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vs, fs);
    
    gl.useProgram(program);
    
    const loc = {
        position: gl.getAttribLocation(program, "a_position"),
        normal: gl.getAttribLocation(program, "a_normal"),
        color: gl.getAttribLocation(program, "a_color"),
        modelMatrix: gl.getUniformLocation(program, "u_modelMatrix"),
        viewMatrix: gl.getUniformLocation(program, "u_viewMatrix"),
        projectionMatrix: gl.getUniformLocation(program, "u_projectionMatrix"),
        normalMatrix: gl.getUniformLocation(program, "u_normalMatrix"),
        lightPosition: gl.getUniformLocation(program, "u_lightPosition"),
        cameraPosition: gl.getUniformLocation(program, "u_cameraPosition"),
    };
    
    // Carregar modelo OBJ principal
    console.log('Carregando modelo...');
    const data = await carregarModeloOBJ(
        "models/little_chef_overcooked_like.obj",
        "models/little_chef_overcooked_like.mtl"
    );
    console.log("Modelo carregado!", data.numVertices, "vértices");
    
const personagem = {
        vertexBuffer: configBuffer(gl, data.vertices),
        normalBuffer: configBuffer(gl, data.normais),
        colorBuffer: configBuffer(gl, data.cores),
        numVertices: data.numVertices,
    };

    const cameraPos = [0, 2, 6];
    const viewMatrix = m4.setViewingMatrix(cameraPos, [0, 1, 0], [0, 1, 0]);

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = m4.setPerspectiveProjectionMatrix(
        -aspect, aspect,
        -1, 1,
        -2, -20
    );

    gl.uniformMatrix4fv(loc.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(loc.projectionMatrix, false, projectionMatrix);
    gl.uniform3fv(loc.lightPosition, [5, 5, 5]);
    gl.uniform3fv(loc.cameraPosition, cameraPos);

    gl.enable(gl.DEPTH_TEST);

    let angulo = 0;

    function render() {
        angulo += 0.01;

        gl.clearColor(0.15, 0.15, 0.2, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let modelMatrix = m4.identity();
        modelMatrix = m4.yRotate(modelMatrix, angulo);
        modelMatrix = m4.scale(modelMatrix, 7.8, 8, 8);

        drawModel(gl, program, loc, personagem, modelMatrix);

        requestAnimationFrame(render);
    }
    render();
}

window.addEventListener("load", main);