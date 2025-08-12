// Mock de busca de endereço por CEP (API externa)
// Substituir futuramente por consumo de um serviço real (ex.: ViaCEP)

export interface AddressData {
  street: string;
  district: string;
  city: string;
  state: string; // UF
}

export async function fetchAddressByZipCode(zip: string): Promise<AddressData> {
  // Simula latência de rede
  await new Promise((r) => setTimeout(r, 500));
  // Retorno estático para demonstração
  return {
    street: "Rua das Palmeiras",
    district: "Centro",
    city: "São Paulo",
    state: "SP",
  };
}
