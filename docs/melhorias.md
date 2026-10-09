## O QUE HÁ DE MELHORAR


**a pagina Caça-páginas suspeitas em .ms.gov.br, cliclando no botão começar via API le te redireciona para a pagina Auditoria de URLs, que mostra as informações de login, mas quando clico no botão entrar e coloco as informações corretas, ele me redireciona para a pagina modo CVS(sem login), isso só acontece na primeira tentaviva, quando você volta para o inicio e refaz os passos, a aplicação te redireciona da página correta.**

----------------

**o código apresenta um erro quando o usuário clica em alguns do botão para iniciar o filtro, como enviar csv ou começar via API.**

{
Console Error

Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

See more info here: https://nextjs.org/docs/messages/react-hydration-error


- className="sc-ds-badge-h hydrated"
+ Modo API (precisa login)
- className="sc-ds-button-h sc-ds-button hydrated"
- className="sc-ds-button-h sc-ds-button hydrated"
+ Entrar
- className="sc-ds-button-h sc-ds-button hydrated"
+ Usar o modo CSV (sem login)
}

--------------------------

**Está suspeito que quando acesso a pagina de login, seleciono o site que irei scannear, ele me traz as tabelas com essas URLs, o problema é que está retornando muitas URLs, por exemplo se eu selecionar o 90 dias, ele me traz mais de 8.000 URLs mas quando acesso o google search console e faço o download do CVS, no arquivo ele possui apenas 1.000 URLs.**

------------------------------

**Na página Modo API (precisa login) o botão para deslogar, está com o texto errado, Entrarsair.**