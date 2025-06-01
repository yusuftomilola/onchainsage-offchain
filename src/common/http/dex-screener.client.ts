import axios from 'axios';

export const getDexScreenerTokenData = async (tokenAddress: string) => {
  const url = `https://api.dexscreener.com/latest/dex/pairs/solana/${tokenAddress}`;
  const { data } = await axios.get(url);
  return data;
};
