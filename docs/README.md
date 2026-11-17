# Documentação — Auditoria GSC SETDIG

Pasta de artefatos de processo e desenho do fluxo.

## Arquivos

| Arquivo | O que é |
|---|---|
| `fluxo-google-search.bpmn` | Diagrama BPMN 2.0 do processo de auditoria (importação do CSV ou API → filtro → classificação → export). |

## Como visualizar o BPMN

Opções (nenhuma precisa instalar):

- **bpmn.io** — abra <https://demo.bpmn.io/>, arraste o `.bpmn` na tela.
- **Camunda Modeler** — https://camunda.com/download/modeler/ (desktop).
- **VS Code** — extensão "BPMN Modeler" (`bpmn-io.vs-code-bpmn-io`).

## Fluxo em alto nível

1. **Entrada**: o usuário escolhe modo CSV (sem login) ou modo API (com login + credencial GSC).
2. **Backend** aplica a lista de termos (padrão + customizados do `/termos`) e as regras automáticas de URL (ex: `wp-content/languages/store.php`).
3. **Resposta JSON** com páginas separadas em `maliciosas` + `limpas`, cada uma com termos encontrados.
4. **Frontend** renderiza tabela única com filtros, estatísticas de termos, botão de reclassificação manual (override em `sessionStorage`).
5. **Export CSV** respeita filtro + inclui coluna `Reclassificado`.

Fluxo detalhado está no arquivo BPMN.
