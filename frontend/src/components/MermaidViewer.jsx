import { useEffect, useRef, useState } from 'react';
import { IconLayers, IconCode } from './Icons.jsx';

/**
 * Structured Mermaid Diagram Viewer.
 * Dynamically loads and renders Mermaid SVG charts safely,
 * with structured specification fallback and raw code switcher.
 */
export default function MermaidViewer({ chart }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [viewCode, setViewCode] = useState(false);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!chart || chart.trim() === 'null') {
      setSvgContent('');
      return;
    }

    let isMounted = true;

    async function renderMermaid() {
      try {
        // If window.mermaid is not yet available, dynamically load from lightweight cdn
        if (!window.mermaid) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
          script.async = true;
          document.head.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            setTimeout(resolve, 2500); // timeout fallback
          });
        }

        if (window.mermaid) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'neutral',
            securityLevel: 'loose',
            fontFamily: 'Instrument Sans, sans-serif',
          });

          const id = 'mermaid-' + Math.random().toString(36).substring(2, 9);
          const { svg } = await window.mermaid.render(id, chart);
          if (isMounted) {
            setSvgContent(svg);
            setRenderError(false);
          }
        } else {
          if (isMounted) setRenderError(true);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[MermaidViewer] Render error:', err);
          setRenderError(true);
        }
      }
    }

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (!chart || chart.trim() === 'null') return null;

  return (
    <div className="topic-diagram-box">
      <div className="diagram-header">
        <div className="diagram-header-left">
          <IconLayers size={13} />
          <span>Architectural Workflow Diagram</span>
        </div>
        <button
          type="button"
          className="btn-diagram-view-toggle"
          onClick={() => setViewCode((v) => !v)}
          title="Toggle between Rendered Diagram and Mermaid Specification"
        >
          <IconCode size={13} />
          <span>{viewCode ? 'View Diagram' : 'View Code'}</span>
        </button>
      </div>

      {viewCode || renderError || !svgContent ? (
        <pre className="diagram-content">{chart}</pre>
      ) : (
        <div
          ref={containerRef}
          className="mermaid-svg-container"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </div>
  );
}
