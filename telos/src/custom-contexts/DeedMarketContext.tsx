import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ethPriceInput,
  SEED_DEED_LISTINGS,
  type DeedListing,
  type DeedOwnership,
} from "../deeds";

/** v2 stores only pons stock-paired deed listings. */
const LISTINGS_KEY = "telos.deed-listings.v2";
const OWNERSHIP_KEY = "telos.deed-ownership.v2";

type OwnershipMap = Record<string, DeedOwnership>;

type NewDeedListing = {
  vaultId: string;
  priceEth: string;
  seller: string;
  sellerAddress?: string;
};

type DeedMarketContextValue = {
  listings: DeedListing[];
  ownership: OwnershipMap;
  listDeed: (input: NewDeedListing) => DeedListing;
  cancelListing: (listingId: string) => void;
  purchaseDeed: (
    listing: DeedListing,
    buyer: string,
    txHash: string,
  ) => DeedOwnership | undefined;
};

const DeedMarketContext = createContext<DeedMarketContextValue | null>(null);

function loadListings(): DeedListing[] {
  try {
    const raw = window.localStorage.getItem(LISTINGS_KEY);
    if (raw === null) return SEED_DEED_LISTINGS;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DeedListing[]) : SEED_DEED_LISTINGS;
  } catch {
    return SEED_DEED_LISTINGS;
  }
}

function loadOwnership(): OwnershipMap {
  try {
    const raw = window.localStorage.getItem(OWNERSHIP_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as OwnershipMap)
      : {};
  } catch {
    return {};
  }
}

function persistListings(listings: DeedListing[]) {
  try {
    window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  } catch {
    /* localStorage can be unavailable in private mode. */
  }
}

function persistOwnership(ownership: OwnershipMap) {
  try {
    window.localStorage.setItem(OWNERSHIP_KEY, JSON.stringify(ownership));
  } catch {
    /* localStorage can be unavailable in private mode. */
  }
}

/**
 * Local deed marketplace state.
 *
 * A deed is represented as a listing plus an ownership record. The transfer is
 * simulated in this build, but the sell -> buy -> resell loop behaves like the
 * onchain flow will: buying removes the ask and writes the new owner.
 */
export function DeedMarketProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<DeedListing[]>(loadListings);
  const [ownership, setOwnership] = useState<OwnershipMap>(loadOwnership);

  const listDeed = useCallback((input: NewDeedListing) => {
    const priceEth = ethPriceInput(input.priceEth);
    if (!(Number.parseFloat(priceEth) > 0)) {
      throw new Error("Deed price must be greater than zero");
    }

    const listing: DeedListing = {
      id: `DEED-${Date.now().toString(36).toUpperCase()}${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`,
      vaultId: input.vaultId,
      seller: input.seller,
      sellerAddress: input.sellerAddress,
      priceEth,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setListings((current) => {
      const next = [
        listing,
        ...current.filter((item) => item.vaultId !== input.vaultId),
      ];
      persistListings(next);
      return next;
    });

    return listing;
  }, []);

  const cancelListing = useCallback((listingId: string) => {
    setListings((current) => {
      const next = current.filter((item) => item.id !== listingId);
      persistListings(next);
      return next;
    });
  }, []);

  const purchaseDeed = useCallback(
    (listing: DeedListing, buyer: string, txHash: string) => {
      if (!listings.some((item) => item.id === listing.id)) return undefined;

      const nextListings = listings.filter((item) => item.id !== listing.id);
      setListings(nextListings);
      persistListings(nextListings);

      const deed: DeedOwnership = {
        vaultId: listing.vaultId,
        owner: buyer,
        acquiredAt: new Date().toISOString(),
        priceEth: listing.priceEth,
        txHash,
      };

      setOwnership((current) => {
        const next = { ...current, [listing.vaultId]: deed };
        persistOwnership(next);
        return next;
      });

      return deed;
    },
    [listings],
  );

  const value = useMemo(
    () => ({
      listings,
      ownership,
      listDeed,
      cancelListing,
      purchaseDeed,
    }),
    [cancelListing, listDeed, listings, ownership, purchaseDeed],
  );

  return (
    <DeedMarketContext.Provider value={value}>
      {children}
    </DeedMarketContext.Provider>
  );
}

export function useDeedMarket() {
  const context = useContext(DeedMarketContext);
  if (!context) {
    throw new Error("useDeedMarket must be used within a DeedMarketProvider");
  }
  return context;
}
