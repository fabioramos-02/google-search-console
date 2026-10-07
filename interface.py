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
        st.dataframe(achados)
        st.write(f"Foram encontrados {len(url_boas)} links bons.")
        st.dataframe(url_boas)
