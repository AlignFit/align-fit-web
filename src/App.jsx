import { useState, useRef, useCallback } from 'react';

const STATUS = {
  IDLE: 'idle',
  READY: 'ready',
  ANALYZING: 'analyzing',
  DONE: 'done',
};

export default function App() {
  return (
    <div className="min-h-screen bg-ink">
      <Header />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <About />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-dark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </span>
          <span className="text-[15px] font-medium text-neutral-100">AlignFit</span>
        </a>
        <nav className="hidden gap-7 text-sm text-neutral-400 sm:flex">
          <a href="#como-funciona" className="transition hover:text-neutral-100">Como funciona</a>
          <a href="#problema" className="transition hover:text-neutral-100">O projeto</a>
          <a href="#sobre" className="transition hover:text-neutral-100">Sobre</a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-6 pb-24 pt-20 sm:pt-28">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
      <div className="relative mx-auto max-w-2xl text-center">
        <span className="mb-5 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          Análise de execução por IA
        </span>
        <h1 className="text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl">
          Sua execução está correta?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-neutral-400">
          Envie um vídeo do seu exercício e receba um feedback automático
          sobre a técnica da sua execução.
        </p>
        <div className="mt-10">
          <Uploader />
          <VideoGuide />
        </div>
      </div>
    </section>
  );
}

// ─── constantes de polling ────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5_000;   // checar a cada 5s
const POLL_MAX_ATTEMPTS = 36;     // timeout total: 3 minutos

// ─── labels amigáveis por exercício ──────────────────────────────────────────
const EXERCISE_LABELS = {
  desenvolvimento:  'Desenvolvimento de Ombro',
  elevacaoLateral:  'Elevação Lateral',
  biceps:           'Rosca Direta',
  agachamento:      'Agachamento',
};

function Uploader() {
  const [status, setStatus]           = useState(STATUS.IDLE);
  const [analyzeStep, setAnalyzeStep] = useState('');   // mensagem de progresso
  const [file, setFile]               = useState(null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [result, setResult]           = useState(null);
  const [durationError, setDurationError] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((selected) => {
    if (!selected || !selected.type.startsWith('video/')) return;
    setDurationError(false);
    const url = URL.createObjectURL(selected);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration > 10) {
        URL.revokeObjectURL(url);
        setDurationError(true);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selected);
      setPreviewUrl(url);
      setResult(null);
      setStatus(STATUS.READY);
    };
  }, [previewUrl]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, [handleFile]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setDurationError(false);
    setAnalyzeStep('');
    setStatus(STATUS.IDLE);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── polling: chama GET /result/{fileId} até receber status 200 ─────────────
  const pollResult = async (fileId) => {
    const baseUrl = import.meta.env.VITE_RESULT_API_URL;
    setAnalyzeStep('Aguardando análise pelo modelo de IA…');

    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      try {
        const res = await fetch(`${baseUrl}/${fileId}`);

        if (res.status === 202) {
          // ainda processando — atualiza mensagem de progresso
          const elapsed = Math.round(((attempt + 1) * POLL_INTERVAL_MS) / 1000);
          setAnalyzeStep(`Processando… ${elapsed}s`);
          continue;
        }

        if (res.ok) {
          const data = await res.json();
          const exerciseLabel = EXERCISE_LABELS[data.exercicio] ?? data.exercicio ?? '—';
          const isCorrect     = data.execucao === 'correta';

          setResult({
            correct:  isCorrect,
            exercise: exerciseLabel,
            execution: data.execucao,
            message:  data.mensagem ?? (isCorrect ? 'Execução correta!' : 'Execução com erros — revise a técnica.'),
            status:   data.status,
          });
          setStatus(STATUS.DONE);
          return;
        }

        // erro HTTP inesperado
        throw new Error(`Resposta inesperada do servidor (${res.status})`);

      } catch (err) {
        setResult({ correct: false, message: `Erro ao consultar resultado: ${err.message}` });
        setStatus(STATUS.DONE);
        return;
      }
    }

    // timeout
    setResult({ correct: false, message: 'O tempo de análise esgotou. Tente novamente com um vídeo mais curto.' });
    setStatus(STATUS.DONE);
  };

  // ── fluxo principal: presigned URL → PUT no S3 → polling ──────────────────
  const analyze = async () => {
    setStatus(STATUS.ANALYZING);
    setAnalyzeStep('Preparando upload…');

    try {
      // 1. Solicitar presigned URL
      const uploadRes = await fetch(import.meta.env.VITE_UPLOAD_API_URL, {
        method: 'POST',
      });
      if (!uploadRes.ok) throw new Error(`Falha ao obter URL de upload (${uploadRes.status})`);

      const { upload_url, file_id } = await uploadRes.json();

      // 2. Enviar o vídeo diretamente para o S3
      setAnalyzeStep('Enviando vídeo…');
      const s3Res = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4' },
        body: file,
      });
      if (!s3Res.ok) throw new Error(`Falha no upload para o S3 (${s3Res.status})`);

      // 3. Polling do resultado
      await pollResult(file_id);

    } catch (err) {
      setResult({ correct: false, message: `Erro: ${err.message}` });
      setStatus(STATUS.DONE);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      {status === STATUS.IDLE && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border border-dashed p-10 transition
            ${dragging ? 'border-accent bg-accent/10' : 'border-accent/40 bg-accent/[0.04] hover:border-accent/70 hover:bg-accent/[0.07]'}`}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-100">Arraste seu vídeo aqui</p>
          <p className="mt-1 text-xs text-neutral-500">ou clique para selecionar · MP4, MOV até 50MB</p>
          <span className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-dark">
            Selecionar vídeo
          </span>
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left">
            <p className="text-xs font-medium text-amber-300">Atenção antes de enviar</p>
            <ul className="mt-1 list-disc pl-4 text-xs leading-relaxed text-amber-200/70">
              <li>Envie apenas <span className="font-semibold text-amber-200">1 vídeo por vez</span></li>
              <li>Duração máxima de <span className="font-semibold text-amber-200">10 segundos</span></li>
            </ul>
          </div>
          {durationError && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-left">
              <p className="text-xs font-medium text-red-300">Vídeo muito longo</p>
              <p className="mt-0.5 text-xs text-red-200/70">O vídeo selecionado ultrapassa 10 segundos. Por favor, envie um clipe mais curto.</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {status !== STATUS.IDLE && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface text-left">
          {previewUrl && (
            <video src={previewUrl} controls className="aspect-video w-full bg-black object-contain" />
          )}
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm text-neutral-300">{file?.name}</span>
              <button onClick={reset} className="shrink-0 text-xs text-neutral-500 transition hover:text-neutral-300">
                Trocar vídeo
              </button>
            </div>

            {status === STATUS.READY && (
              <button
                onClick={analyze}
                className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-accent-dark transition hover:bg-accent/90"
              >
                Analisar execução
              </button>
            )}

            {status === STATUS.ANALYZING && (
              <div className="space-y-3 py-3">
                <div className="flex items-center justify-center gap-3 text-sm text-neutral-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                  {analyzeStep || 'Analisando execução…'}
                </div>
                <div className="mx-4 h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-accent/40 to-transparent bg-[length:200%_100%]" />
                </div>
              </div>
            )}

            {status === STATUS.DONE && result && (
              <div
                className={`rounded-lg border p-4 ${
                  result.correct
                    ? 'border-accent/30 bg-accent/10'
                    : 'border-amber-500/30 bg-amber-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={result.correct ? 'text-accent' : 'text-amber-400'}>
                    {result.correct ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M10.3 3.9l-8 14A1.5 1.5 0 003.7 20h16.6a1.5 1.5 0 001.3-2.1l-8-14a1.5 1.5 0 00-2.6 0z" /></svg>
                    )}
                  </span>
                  <span className={`text-sm font-medium ${result.correct ? 'text-accent' : 'text-amber-300'}`}>
                    {result.correct ? 'Execução correta' : 'Precisa de ajustes'}
                  </span>
                </div>

                {/* exercício identificado */}
                {result.exercise && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Exercício identificado</span>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-neutral-200">
                      {result.exercise}
                    </span>
                  </div>
                )}

                <p className="mt-2 text-sm leading-relaxed text-neutral-300">{result.message}</p>

                <button onClick={reset} className="mt-3 text-xs text-neutral-400 transition hover:text-neutral-200">
                  Enviar outro vídeo →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VideoGuide() {
  const wrong = [
    'Ajustando o celular ou câmera durante a gravação',
    'Andando ou se deslocando antes de começar',
    'Corpo fora do enquadramento',
    'Gravar antes de se posicionar no lugar',
  ];

  const right = [
    'Somente a execução do exercício no clipe',
    'Câmera já posicionada antes de iniciar',
    'Corpo inteiro visível do início ao fim',
    'Fundo limpo e boa iluminação',
  ];

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <style>{`
        @keyframes vg-shake {
          0%,  100% { transform: translate(0,    0)    rotate(0deg);    }
          15%        { transform: translate(-3px, -1px) rotate(-0.8deg); }
          30%        { transform: translate( 2px,  2px) rotate( 0.7deg); }
          45%        { transform: translate(-2px, -2px) rotate(-0.5deg); }
          60%        { transform: translate( 3px,  1px) rotate( 0.8deg); }
          75%        { transform: translate(-1px,  2px) rotate(-0.4deg); }
          90%        { transform: translate( 1px, -1px) rotate( 0.3deg); }
        }
        @keyframes vg-walk {
          0%   { transform: translateX(-38px); }
          100% { transform: translateX( 38px); }
        }
        @keyframes vg-squat {
          0%, 100% { transform: translateY(0px);  }
          50%      { transform: translateY(13px); }
        }
        @keyframes vg-blink {
          0%, 48%, 100% { opacity: 1;   }
          50%, 98%      { opacity: 0.1; }
        }
      `}</style>

      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">
        Como gravar o vídeo
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* ── Errado ── */}
        <div className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/[0.06]">
          <div className="bg-black/40 p-3">
            <svg viewBox="0 0 200 130" className="w-full rounded-lg" aria-hidden="true">
              <defs>
                <clipPath id="vg-wrong-clip">
                  <rect x="4" y="4" width="192" height="122" rx="6" />
                </clipPath>
              </defs>
              {/* Clipped area — shake applied inside */}
              <g clipPath="url(#vg-wrong-clip)">
                <g style={{ animation: 'vg-shake 0.3s ease-in-out infinite', transformOrigin: '100px 65px' }}>
                  <rect x="4" y="4" width="192" height="122" rx="6" fill="#0f0f0f" />
                  <line x1="4" y1="112" x2="196" y2="112" stroke="#252525" strokeWidth="1" />
                  {/* Walking figure */}
                  <g style={{ animation: 'vg-walk 1.8s linear infinite' }}>
                    <circle cx="100" cy="46" r="8" fill="#6b7280" />
                    <line x1="100" y1="54"  x2="100" y2="82"  stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="100" y1="62"  x2="82"  y2="74"  stroke="#6b7280" strokeWidth="2"   strokeLinecap="round" />
                    <line x1="100" y1="62"  x2="118" y2="74"  stroke="#6b7280" strokeWidth="2"   strokeLinecap="round" />
                    <line x1="100" y1="82"  x2="88"  y2="112" stroke="#6b7280" strokeWidth="2"   strokeLinecap="round" />
                    <line x1="100" y1="82"  x2="112" y2="112" stroke="#6b7280" strokeWidth="2"   strokeLinecap="round" />
                  </g>
                </g>
              </g>
              {/* REC — fora do grupo que treme */}
              <circle cx="18" cy="18" r="5" fill="#ef4444" style={{ animation: 'vg-blink 1s ease-in-out infinite' }} />
              <text x="27" y="22" fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">REC</text>
            </svg>
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-red-400">Evite isso</span>
            </div>
            <ul className="space-y-2.5">
              {wrong.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-neutral-400">
                  <span className="mt-0.5 shrink-0 text-red-500/50">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Certo ── */}
        <div className="overflow-hidden rounded-xl border border-accent/20 bg-accent/[0.06]">
          <div className="bg-black/40 p-3">
            <svg viewBox="0 0 200 130" className="w-full rounded-lg" aria-hidden="true">
              <defs>
                <clipPath id="vg-right-clip">
                  <rect x="4" y="4" width="192" height="122" rx="6" />
                </clipPath>
              </defs>
              <g clipPath="url(#vg-right-clip)">
                <rect x="4" y="4" width="192" height="122" rx="6" fill="#0f0f0f" />
                <line x1="4" y1="112" x2="196" y2="112" stroke="#252525" strokeWidth="1" />
                {/* Crosshair guide */}
                <line x1="100" y1="4"  x2="100" y2="126" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.06" strokeDasharray="4 4" />
                <line x1="4"   y1="65" x2="196" y2="65"  stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.06" strokeDasharray="4 4" />
                {/* Squatting figure */}
                <g style={{ animation: 'vg-squat 1.4s ease-in-out infinite' }}>
                  <circle cx="100" cy="43" r="8" fill="#6ee7b7" />
                  <line x1="100" y1="51"  x2="100" y2="79"  stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Arms forward/out — squat pose */}
                  <line x1="100" y1="60"  x2="76"  y2="55"  stroke="#6ee7b7" strokeWidth="2"   strokeLinecap="round" />
                  <line x1="100" y1="60"  x2="124" y2="55"  stroke="#6ee7b7" strokeWidth="2"   strokeLinecap="round" />
                  <line x1="100" y1="79"  x2="84"  y2="112" stroke="#6ee7b7" strokeWidth="2"   strokeLinecap="round" />
                  <line x1="100" y1="79"  x2="116" y2="112" stroke="#6ee7b7" strokeWidth="2"   strokeLinecap="round" />
                </g>
              </g>
              <circle cx="18" cy="18" r="5" fill="#ef4444" style={{ animation: 'vg-blink 1s ease-in-out infinite' }} />
              <text x="27" y="22" fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">REC</text>
            </svg>
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-accent">Faça assim</span>
            </div>
            <ul className="space-y-2.5">
              {right.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-neutral-400">
                  <span className="mt-0.5 shrink-0 text-accent/60">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Problem() {
  return (
    <section id="problema" className="border-t border-white/5 bg-surface px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">O problema</p>
        <h2 className="text-2xl font-semibold text-neutral-50 sm:text-3xl">
          Treinar sozinho, sem saber se está certo
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-400">
          Grande parte das pessoas que treinam não tem acompanhamento profissional
          constante. Sem alguém para corrigir a execução, erros de técnica passam
          despercebidos e se repetem — o que reduz os resultados e aumenta o risco
          de lesão. Falta uma forma acessível e imediata de validar se um exercício
          está sendo feito corretamente.
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-400">
          Este projeto propõe uma solução baseada em visão computacional: a pessoa
          envia um vídeo curto da execução e recebe, em segundos, um retorno
          automático sobre a qualidade do movimento.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: 'Envie o vídeo',
      desc: 'Grave o exercício e suba o arquivo direto pelo navegador.',
      icon: (
        <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      ),
    },
    {
      title: 'Análise pelo modelo',
      desc: 'O modelo de IA processa o movimento e avalia a técnica.',
      icon: (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
        </>
      ),
    },
    {
      title: 'Receba o feedback',
      desc: 'Veja na hora se a execução está correta ou precisa de ajustes.',
      icon: (
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      ),
    },
  ];

  return (
    <section id="como-funciona" className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Como funciona</p>
        <h2 className="text-2xl font-semibold text-neutral-50 sm:text-3xl">Três passos, sem complicação</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {s.icon}
                </svg>
              </span>
              <h3 className="mt-4 text-base font-medium text-neutral-100">
                {i + 1}. {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="sobre" className="border-t border-white/5 bg-surface px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Sobre o projeto</p>
        <h2 className="text-2xl font-semibold text-neutral-50 sm:text-3xl">
          Trabalho de Conclusão de Curso
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-400">
          Esta aplicação foi desenvolvida como TCC e tem como objetivo aplicar
          técnicas de visão computacional e aprendizado de máquina na análise
          automática da execução de exercícios físicos. A interface web permite
          que qualquer pessoa envie um vídeo e obtenha um retorno simples e direto,
          tornando esse tipo de avaliação mais acessível.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-8">
      <div className="mx-auto max-w-6xl text-center text-xs text-neutral-600">
        AlignFit · Projeto de TCC · {new Date().getFullYear()}
      </div>
    </footer>
  );
}
