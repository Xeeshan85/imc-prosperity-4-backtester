from dataclasses import dataclass
from prosperity4bt.datamodel import Symbol, Trade


@dataclass
class MarketTrade:
    trade: Trade
    buy_quantity: int
    sell_quantity: int


@dataclass
class PriceRow:
    day: int
    timestamp: int
    product: Symbol
    bid_prices: list[int]
    bid_volumes: list[int]
    ask_prices: list[int]
    ask_volumes: list[int]
    mid_price: float
    profit_loss: float

    @classmethod
    def parse_from_str(cls, line: str):
        columns = line.split(";")
        return PriceRow(
            day=int(columns[0]),
            timestamp=int(columns[1]),
            product=columns[2],
            bid_prices=cls.__get_column_values(columns, [3, 5, 7]),
            bid_volumes=cls.__get_column_values(columns, [4, 6, 8]),
            ask_prices=cls.__get_column_values(columns, [9, 11, 13]),
            ask_volumes=cls.__get_column_values(columns, [10, 12, 14]),
            mid_price=float(columns[15]),
            profit_loss=float(columns[16]),
        )

    @staticmethod
    def __get_column_values(columns: list[str], indices: list[int]) -> list[int]:
        values = []
        for index in indices:
            value = columns[index]
            if value == "":
                break
            values.append(int(value))
        return values

    def to_dict(self) -> dict:
        return {
            "day": self.day,
            "timestamp": self.timestamp,
            "product": self.product,
            "bid_prices": self.bid_prices,
            "bid_volumes": self.bid_volumes,
            "ask_prices": self.ask_prices,
            "ask_volumes": self.ask_volumes,
            "mid_price": self.mid_price,
            "profit_loss": self.profit_loss
        }


@dataclass
class ObservationRow:
    timestamp: int
    bidPrice: float
    askPrice: float
    transportFees: float
    exportTariff: float
    importTariff: float
    sugarPrice: float
    sunlightIndex: float

    @classmethod
    def parse_from_str(cls, line: str):
        columns = line.split(";")
        return ObservationRow(
            timestamp = int(columns[0]),
            bidPrice = float(columns[1]),
            askPrice = float(columns[2]),
            transportFees = float(columns[3]),
            exportTariff = float(columns[4]),
            importTariff = float(columns[5]),
            sugarPrice = float(columns[6]),
            sunlightIndex = float(columns[7]),
        )

    def to_dic(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "bidPrice": self.bidPrice,
            "askPrice": self.askPrice,
            "transportFees": self.transportFees,
            "exportTariff": self.exportTariff,
            "importTariff": self.importTariff,
            "sugarPrice": self.sugarPrice,
            "sunlightIndex": self.sunlightIndex,
        }


@dataclass
class BacktestData:
    round_num: int
    day_num: int
    prices: dict[int, dict[Symbol, PriceRow]]
    trades: dict[int, dict[Symbol, list[Trade]]]
    observations: dict[int, ObservationRow]
    products: list[Symbol]
    profit_loss: dict[Symbol, float]

    def to_dict(self):
        return {
            "round_num": self.round_num,
            "day_num": self.day_num,
            "prices": {
                    outer_key: {
                        inner_key: price_row.to_dict() for inner_key, price_row in inner_dict.items()
                    }
                    for outer_key, inner_dict in self.prices.items()
                },
            "trades": {
                    outer_key: {
                        inner_key: [trade.__str__() for trade in trade_list] for inner_key, trade_list in inner_dict.items()
                    }
                    for outer_key, inner_dict in self.trades.items()
                },
            "observations": { k: v.to_dic() for k, v in self.observations.items() },
            "products": self.products,
            "profit_loss": self.profit_loss
        }


    def get_market_trades_at(self, timestamp: int) -> dict[Symbol, list[MarketTrade]]:
        return {
            product: [MarketTrade(t, t.quantity, t.quantity) for t in trades] for product, trades in self.trades[timestamp].items()
        }


