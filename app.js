let chartInstance = null;
let nfcAtivo = false;
let ultimaTagLida = '';
let tempoUltimaLeitura = 0;

function inicializarGrafico(publicoAtual, capacidadeMaxima) {
    const ctx = document.getElementById('graficoLotacao').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    const vagasDisponiveis = Math.max(0, capacidadeMaxima - publicoAtual);

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Público Atual', 'Vagas Disponíveis'],
            datasets: [{
                data: [publicoAtual, vagasDisponiveis],
                backgroundColor: ['#007bff', '#e9ecef']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Acompanhamento de Ocupação' }
            }
        }
    });
}

function atualizarPainel() {
    fetch('api.php')
        .then(response => response.json())
        .then(data => {
            document.getElementById('publico-atual').innerText = data.publico_atual;
            document.getElementById('capacidade-maxima').innerText = data.capacidade_maxima;
            document.getElementById('total-entradas').innerText = data.total_entradas;
            document.getElementById('total-saidas').innerText = data.total_saidas;

            const statusBox = document.getElementById('status-alerta');

            // Prevenção de Superlotação[cite: 1]
            if (data.bloquear_catraca) {
                statusBox.className = 'status-box critico';
                statusBox.innerText = 'LOTAÇÃO MÁXIMA ATINGIDA! CATRACA BLOQUEADA.';
            } else if (data.alerta_preventivo) {
                statusBox.className = 'status-box alerta';
                statusBox.innerText = `ALERTA PREVENTIVO: ${data.percentual_ocupacao}% da capacidade ocupada.`;
            } else {
                statusBox.className = 'status-box normal';
                statusBox.innerText = `Lotação Normal (${data.percentual_ocupacao}%)`;
            }

            inicializarGrafico(data.publico_atual, data.capacidade_maxima);
        })
        .catch(error => console.error('Erro ao buscar dados:', error));
}

// Exibir Caixa de Diálogo Customizada
function abrirDialogo(texto, erro = false) {
    const msgElement = document.getElementById('modal-mensagem');
    msgElement.innerText = texto;
    msgElement.style.color = erro ? 'red' : '#333';

    document.getElementById('modal-dialogo').style.display = 'flex';
    
    setTimeout(fecharDialogo, 2500);
}

function fecharDialogo() {
    document.getElementById('modal-dialogo').style.display = 'none';
}

function registrarLeitura(tagId) {
    const formData = new FormData();
    formData.append('tag_id', tagId);

    fetch('api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        atualizarPainel();

        if (data.sucesso_registro === false) {
            // Exibe mensagem de bloqueio em vermelho caso a catraca esteja travada[cite: 1]
            abrirDialogo(`⛔ ${data.mensagem}\nTAG: ${tagId}`, true);
        } else {
            abrirDialogo(`TAG: ${tagId}\n${data.mensagem}\nOcupação Atual: ${data.publico_atual}`);
        }
    })
    .catch(error => console.error('Erro ao registrar leitura:', error));
}

async function iniciarLeituraNFC() {
    const statusText = document.getElementById('nfc-status');

    if (nfcAtivo) {
        statusText.innerText = "📡 Leitor NFC ativo. Aproxime a TAG.";
        return;
    }

    if ('NDEFReader' in window) {
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            
            nfcAtivo = true;
            statusText.style.color = "green";
            statusText.innerText = "📡 Leitor ativo! Encoste a TAG no celular...";

            ndef.addEventListener("reading", ({ serialNumber }) => {
                const tagId = serialNumber || "TAG_PADRAO";
                const agora = Date.now();

                // Trava de 3 segundos contra leituras duplas continuas
                if (tagId === ultimaTagLida && (agora - tempoUltimaLeitura) < 3000) {
                    return;
                }

                ultimaTagLida = tagId;
                tempoUltimaLeitura = agora;

                registrarLeitura(tagId);
            });

        } catch (error) {
            statusText.style.color = "red";
            statusText.innerText = "Erro ao ativar NFC: " + error.message;
        }
    } else {
        statusText.style.color = "red";
        statusText.innerText = "Web NFC não suportado neste navegador (Usa o Chrome no Android).";
    }
}

window.addEventListener('load', atualizarPainel);
setInterval(atualizarPainel, 3000);