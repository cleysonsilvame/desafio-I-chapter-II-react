import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const productExistsOnCart = newCart.find(
        product => product.id === productId
      );

      const { data: stockItem } = await api.get<Stock>(`/stock/${productId}`);

      const quantityOfDesiredProducts = productExistsOnCart
        ? productExistsOnCart.amount + 1
        : 1;

      if (quantityOfDesiredProducts > stockItem.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExistsOnCart) {
        productExistsOnCart.amount = quantityOfDesiredProducts;
      } else {
        const { data: product } = await api.get<Omit<Product, "amount">>(
          `/products/${productId}`
        );

        newCart.push({
          ...product,
          amount: 1,
        });
      }

      setCart(newCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];
      const productIndex = newCart.findIndex(
        product => product.id === productId
      );

      if (productIndex >= 0) {
        newCart.splice(productIndex, 1);
        setCart(newCart);
      } else {
        throw Error("Product not found");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stockItem } = await api.get<Stock>(`/stock/${productId}`);

      if (amount > stockItem.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = [...cart];

      const productExists = newCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;

        setCart(newCart);
      } else {
        throw Error("Product not found");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;
  
  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
