// Description: This module fetches token data from the Raydium API.
import axios from 'axios';

export const getRaydiumTokenData = async () => {
  const url = 'https://api.raydium.io/pairs'; // lists all pairs
  const { data } = await axios.get(url);
  return data;
};
