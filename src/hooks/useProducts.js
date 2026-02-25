import { useState, useEffect, useCallback } from 'react';
import { productsService } from '@/services/products.service';
import { sileo } from 'sileo';

const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productsService.getAll();
      setProducts(data);
    } catch (err) {
      setError(err.message);
      sileo.error({ title: 'Error al cargar productos', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const searchProducts = useCallback(async (query) => {
    if (!query.trim()) {
      return fetchProducts();
    }
    try {
      setLoading(true);
      const data = await productsService.search(query);
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts, searchProducts };
};

const useProduct = (id) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productsService.getById(id);
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  return { product, loading, error };
};

export { useProducts, useProduct };
