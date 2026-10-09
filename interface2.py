from interface import arquivo
from filtrar import get_url_boas
from filtrar import filtrar_url
import streamlit as st
import pandas as pd

arquivo = st.file_uploader("Envie a planilha (.csv)", type=["csv"])
if arquivo:
    st.success("Arquivo carregado!")
    if st.button("Filtrar URLs"):
        achados = filtrar_url(arquivo)
        url_boas = get_url_boas()

        # 1. Inicializa os DataFrames no session_state para persistir os dados
        if "df_origem" not in st.session_state:
            st.session_state.df_origem = pd.read_csv(achados)

        if "df_destino" not in st.session_state:
            st.session_state.df_destino = pd.read_csv(url_boas)


        # 2. Função que realiza a movimentação da linha
        def mover_linha(index):
            # Seleciona a linha com base no índice
            linha_para_mover = st.session_state.df_origem.loc[[index]]

            # Adiciona a linha ao DataFrame de destino
            st.session_state.df_destino = pd.concat(
                [st.session_state.df_destino, linha_para_mover], ignore_index=True
            )

            # Remove a linha do DataFrame de origem e reseta o índice
            st.session_state.df_origem = st.session_state.df_origem.drop(
                index
            ).reset_index(drop=True)


        # 3. Interface Visual do Streamlit
        st.title("Mover Linhas entre DataFrames")

        st.subheader("📋 DataFrame de Origem")
        if not st.session_state.df_origem.empty:
            # Exibe as linhas com um botão de ação ao lado de cada uma
            for idx, row in st.session_state.df_origem.iterrows():
                col1, col2 = st.columns([4, 1])
                col1.write(f"**{row['Tarefa']}** — {row['Prioridade']}")

                # O botão passa o índice atual para a função de mover
                if col2.button("Concluir", key=f"btn_{idx}"):
                    mover_linha(idx)
                    st.rerun()  # Recarrega a página para atualizar os DataFrames visualmente
        else:
            st.info("Nenhuma tarefa restante na origem!")

        st.write("---")

        st.subheader("✅ DataFrame de Destino (Concluídas)")
        if not st.session_state.df_destino.empty:
            st.dataframe(st.session_state.df_destino, use_container_width=True)
        else:
            st.caption("Nenhuma tarefa movida ainda.")
