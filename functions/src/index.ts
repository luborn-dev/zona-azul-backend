import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const app = admin.initializeApp();
const db = app.firestore();
const collVeiculos = db.collection("veiculos");

interface CallableResponse{
  status: string,
  message: string,
  payload: JSON
}

interface Placas{
  placa: string,
  data_p: Date
}

/**
 * Função que analisa se uma placa é válida para ser gravado no banco.
 * Exemplo de validação na entrada. Complemente com as regras que achar
 * importante.
 * @param {Placas} p - Objeto produto a ser validado.
 * @return {number} - Retorna 0 se válido ou o código de erro.
 **/
function analyzePlaca(p: Placas) : number {
  if (!p) {
    return 1;
  } else if (p.placa.length != 8) {
    return 2;
  }
  return 0;
}

// eslint-disable-next-line require-jsdoc
function analyzePlacaConsultas(p: string) : number {
  if (!p) {
    return 1;
  } else if (p.length != 8) {
    return 2;
  }
  return 0;
}

/**
 * Função que dado o código de erro obtido na analyzePlaca,
 * devolve uma mensagem
 * @param {number} code - Código do erro
 * @return {string} - String com a mensagem de erro.
 */
function getErrorMessage(code: number) : string {
  let message = "";
  switch (code) {
    case 1: {
      message = "Placa não informada.";
      break;
    }
    case 2: {
      message = "Placa inválida";
      break;
    }
  }
  return message;
}

export const addNewProduct = functions
    .region("southamerica-east1")
    .https.onCall(async (data, context) => {
      let result: CallableResponse;

      // com o uso do logger, podemos monitorar os erros e o que há.
      functions.logger.info("addNewProduct - Iniciada.");
      // criando o objeto que representa o produto (baseado nos parametros)
      const placa = {
        placa: data.placa,
        data_p: new Date(),
      };
      // inclua aqui a validacao.
      const errorCode = analyzePlaca(placa);
      const errorMessage = getErrorMessage(errorCode);
      if (errorCode > 0) {
        // gravar o erro no log e preparar o retorno.
        functions.logger.error("addNewProduct " +
          "- Erro ao inserir novo produto:" +
          errorCode.toString()),

        result = {
          status: "ERROR",
          message: errorMessage,
          payload: JSON.parse(JSON.stringify({docId: null})),
        };
        console.log(result);
      } else {
        // cadastrar o produto pois está ok.
        const docRef = await collVeiculos.add(placa);
        result = {
          status: "SUCCESS",
          message: "Produto inserido com sucesso.",
          payload: JSON.parse(JSON.stringify({docId: docRef.id.toString()})),
        };
        functions.logger.error("addNewProduct - Novo produto inserido");
      }

      // Retornando o objeto result.
      return result;
    });

export const checarRegularidade = functions.region("southamerica-east1")
    .https.onCall(async (data, context) => {
      let result: CallableResponse;

      const placaVeiculo = data.placa;

      const errorCode = analyzePlacaConsultas(placaVeiculo);
      const errorMessage = getErrorMessage(errorCode);
      if (errorCode > 0) {
        functions.logger.error("checarPagamentoVeiculos " +
          "- Erro ao consultar placa:" +
          errorCode.toString()),

        result = {
          status: "ERROR",
          message: errorMessage,
          payload: JSON.parse(JSON.stringify({docId: null})),
        };
        console.log(result);
      } else {
        const pagamentos : Array<Placas> = [];
        const consultaPagamento = await collVeiculos.where("placa",
            "==", placaVeiculo).get();
        let placaPagamento: Placas;
        consultaPagamento.forEach((doc) => {
          const arr = doc.data();
          placaPagamento = {
            placa: arr.placa,
            data_p: arr.data_p,
          };
          pagamentos.push(placaPagamento);
        });

        if (pagamentos.length == 0) {
          const aviso = "NÃO PAGO";
          result = {
            status: "SUCCESS",
            message: "Placa consultada com sucesso",
            payload: JSON.parse(JSON.stringify(aviso)),
          };
        } else {
          result = {
            status: "SUCCESS",
            message: "Placa consultada com sucesso",
            payload: JSON.parse(JSON.stringify(pagamentos)),
          };
        }
      }
      return result;
    });
