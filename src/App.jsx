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
        </div>
      </div>
    </section>
  );
}

function Uploader() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback((selected) => {
    if (!selected || !selected.type.startsWith('video/')) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setStatus(STATUS.READY);
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
    setStatus(STATUS.IDLE);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Integração com backend entra aqui ──
  // Por enquanto simula a chamada e devolve um resultado fake.
  const analyze = async () => {
    setStatus(STATUS.ANALYZING);
    await new Promise((r) => setTimeout(r, 2200));
    const ok = Math.random() > 0.4;
    setResult(
      ok
        ? { correct: true, message: 'Execução correta! A técnica está dentro do padrão esperado.' }
        : { correct: false, message: 'Execução com ajustes. A amplitude do movimento ficou abaixo do ideal.' }
    );
    setStatus(STATUS.DONE);
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
              <div className="flex items-center justify-center gap-3 py-3 text-sm text-neutral-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                Analisando execução…
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
