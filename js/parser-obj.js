// parser-obj.js - Parser para arquivos OBJ

async function carregarModeloOBJ(urlObj, urlMtl = null) {
    const response = await fetch(urlObj);
    const objText = await response.text();

    let materiais = {};
    if (urlMtl) {
        materiais = await carregarMTL(urlMtl);
    }

    return parseOBJ(objText, materiais);
}

function parseOBJ(objText, materiais = {}) {
    const vertices = [];
    const normais = [];
    const cores = [];

    const verticesFinais = [];
    const normaisFinais = [];
    const coresFinais = [];

    let materialAtual = "default";
    const linhas = objText.split("\n");

    for (let linha of linhas) {
        linha = linha.trim();
        if (!linha || linha.startsWith("#")) continue;

        const partes = linha.split(/\s+/);

        if (partes[0] === "v") {
            vertices.push([
                parseFloat(partes[1]),
                parseFloat(partes[2]),
                parseFloat(partes[3])
            ]);
        }
        else if (partes[0] === "vn") {
            normais.push([
                parseFloat(partes[1]),
                parseFloat(partes[2]),
                parseFloat(partes[3])
            ]);
        }
        else if (partes[0] === "usemtl") {
            materialAtual = partes[1];
        }
        else if (partes[0] === "f") {
            const face = partes.slice(1).map(str => {
                const [v, , vn] = str.split("/").map(x => x ? parseInt(x)-1 : null);
                return { v, vn };
            });

            for (let i = 1; i < face.length - 1; i++) {
                const tri = [face[0], face[i], face[i+1]];

                for (let f of tri) {
                    const v = vertices[f.v];
                    verticesFinais.push(v[0], v[1], v[2]);

                    if (f.vn != null) {
                        const n = normais[f.vn];
                        normaisFinais.push(n[0], n[1], n[2]);
                    } else {
                        normaisFinais.push(0,1,0);
                    }

                    const Kd = materiais[materialAtual]?.Kd || [1,1,1];
                    coresFinais.push(Kd[0], Kd[1], Kd[2]);
                }
            }
        }
    }

    return {
        vertices: new Float32Array(verticesFinais),
        normais: new Float32Array(normaisFinais),
        cores: new Float32Array(coresFinais),
        numVertices: verticesFinais.length / 3
    };
}

async function carregarMTL(url) {
    const response = await fetch(url);
    const text = await response.text();
    const materiais = {};
    
    let materialAtual = null;

    const linhas = text.split("\n");
    for (let linha of linhas) {
        linha = linha.trim();
        if (!linha || linha.startsWith("#")) continue;

        const partes = linha.split(/\s+/);

        if (partes[0] === "newmtl") {
            materialAtual = partes[1];
            materiais[materialAtual] = { Kd: [1,1,1] };
        }
        else if (partes[0] === "Kd" && materialAtual) {
            materiais[materialAtual].Kd = [
                parseFloat(partes[1]),
                parseFloat(partes[2]),
                parseFloat(partes[3])
            ];
        }
    }

    return materiais;
}