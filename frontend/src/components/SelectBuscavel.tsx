"use client";

import { useId, useMemo, useState, useRef, useEffect } from "react";

/**
 * Combobox simples: input de texto com lista filtrada abaixo.
 * Nativo HTML (<datalist>) seria mais lazy, mas tem problemas de UX no Chromium
 * (não mostra todas as opções, não filtra consistente). Faço um dropdown próprio.
 */

type Props = {
  label: string;
  opcoes: string[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function SelectBuscavel({ label, opcoes, valor, onChange, placeholder, disabled }: Props) {
  const id = useId();
  const [busca, setBusca] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincroniza se o pai mudar o valor.
  useEffect(() => {
    setBusca(valor);
  }, [valor]);

  // Fecha quando clica fora.
  useEffect(() => {
    function fora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return opcoes.slice(0, 50);
    return opcoes.filter((o) => o.toLowerCase().includes(termo)).slice(0, 50);
  }, [opcoes, busca]);

  return (
    <div className="select-buscavel" ref={containerRef}>
      <label htmlFor={id} className="select-buscavel-label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="select-buscavel-input"
        value={busca}
        placeholder={placeholder ?? "Digite para filtrar..."}
        disabled={disabled}
        onFocus={() => setAberto(true)}
        onChange={(e) => {
          setBusca(e.target.value);
          setAberto(true);
        }}
      />
      {aberto && !disabled && filtradas.length > 0 && (
        <ul className="select-buscavel-lista" role="listbox">
          {filtradas.map((o) => (
            <li
              key={o}
              role="option"
              aria-selected={o === valor}
              onClick={() => {
                onChange(o);
                setBusca(o);
                setAberto(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onChange(o);
                  setBusca(o);
                  setAberto(false);
                }
              }}
              tabIndex={0}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
