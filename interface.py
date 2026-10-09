import streamlit as st
from filtrar import filtrar_url
from filtrar import get_url_boas

st.title("Auditoria de URLs - Google Search Console")

arquivo = st.file_uploader("Envie a planilha (.csv)", type=["csv"])

if arquivo:
    st.success("Arquivo carregado!")
    if st.button("Filtrar URLs"):
        achados = filtrar_url(arquivo)
        url_boas = get_url_boas()
        st.write(f"Foram encontrados {len(achados)} links suspeitos.")
        if 'tabela_url_maliciosas' not in st.session_state:
            st.session_state['tabela_url_maliciosas'] = st.dataframe(achados, hide_index=True, column_config={
                "Páginas principais": st.column_config.TextColumn("Páginas principais",width="large")
            })
        st.write(f"Foram encontrados {len(url_boas)} links bons.")
        if 'tabela_url_boas' not in st.session_state:
            st.session_state['tabela_url_boas'] = st.dataframe(url_boas, hide_index=True, column_config={
                "Páginas principais": st.column_config.TextColumn("Páginas principais",width="large")
            })
