from collections import defaultdict
from dataclasses import dataclass

from prosperity4bt.datamodel import Symbol, Trade
from prosperity4bt.file_reader import FileReader

LIMITS = {
    "EMERALDS": 80,
    "TOMATOES": 80,
    'INTARIAN_PEPPER_ROOT': 80,
    'ASH_COATED_OSMIUM': 80,
    'HYDROGEL_PACK': 200,
    'VELVETFRUIT_EXTRACT': 200,
    'VELVETFRUIT_EXTRACT_VOUCHER': 300,
    'VEV_4000': 300,
    'VEV_4500': 300,
    'VEV_5000': 300,
    'VEV_5100': 300,
    'VEV_5200': 300,
    'VEV_5300': 300,
    'VEV_5400': 300,
    'VEV_5500': 300,
    'VEV_6000': 300,
    'VEV_6500': 300,
    # Galaxy Sounds Recorders
    "GALAXY_SOUNDS_DARK_MATTER": 10,
    "GALAXY_SOUNDS_BLACK_HOLES": 10,
    "GALAXY_SOUNDS_PLANETARY_RINGS": 10,
    "GALAXY_SOUNDS_SOLAR_WINDS": 10,
    "GALAXY_SOUNDS_SOLAR_FLAMES": 10,
    # Vertical Sleeping Pods
    "SLEEP_POD_SUEDE": 10,
    "SLEEP_POD_LAMB_WOOL": 10,
    "SLEEP_POD_POLYESTER": 10,
    "SLEEP_POD_NYLON": 10,
    "SLEEP_POD_COTTON": 10,
    # Organic Microchips
    "MICROCHIP_CIRCLE": 10,
    "MICROCHIP_OVAL": 10,
    "MICROCHIP_SQUARE": 10,
    "MICROCHIP_RECTANGLE": 10,
    "MICROCHIP_TRIANGLE": 10,
    # Purification Pebbles
    "PEBBLES_XS": 10,
    "PEBBLES_S": 10,
    "PEBBLES_M": 10,
    "PEBBLES_L": 10,
    "PEBBLES_XL": 10,
    # Domestic Robots
    "ROBOT_VACUUMING": 10,
    "ROBOT_MOPPING": 10,
    "ROBOT_DISHES": 10,
    "ROBOT_LAUNDRY": 10,
    "ROBOT_IRONING": 10,
    # UV-Visors
    "UV_VISOR_YELLOW": 10,
    "UV_VISOR_AMBER": 10,
    "UV_VISOR_ORANGE": 10,
    "UV_VISOR_RED": 10,
    "UV_VISOR_MAGENTA": 10,
    # Instant Translators
    "TRANSLATOR_SPACE_GRAY": 10,
    "TRANSLATOR_ASTRO_BLACK": 10,
    "TRANSLATOR_ECLIPSE_CHARCOAL": 10,
    "TRANSLATOR_GRAPHITE_MIST": 10,
    "TRANSLATOR_VOID_BLUE": 10,
    # Construction Panels
    "PANEL_1X2": 10,
    "PANEL_2X2": 10,
    "PANEL_1X4": 10,
    "PANEL_2X4": 10,
    "PANEL_4X4": 10,
    # Liquid Breath Oxygen Shakes
    "OXYGEN_SHAKE_MORNING_BREATH": 10,
    "OXYGEN_SHAKE_EVENING_BREATH": 10,
    "OXYGEN_SHAKE_MINT": 10,
    "OXYGEN_SHAKE_CHOCOLATE": 10,
    "OXYGEN_SHAKE_GARLIC": 10,
    # Protein Snack Packs
    "SNACKPACK_CHOCOLATE": 10,
    "SNACKPACK_VANILLA": 10,
    "SNACKPACK_PISTACHIO": 10,
    "SNACKPACK_STRAWBERRY": 10,
    "SNACKPACK_RASPBERRY": 10,
}


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


def get_column_values(columns: list[str], indices: list[int]) -> list[int]:
    values = []

    for index in indices:
        value = columns[index]
        if value == "":
            break

        values.append(int(value))

    return values


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


@dataclass
class BacktestData:
    round_num: int
    day_num: int

    prices: dict[int, dict[Symbol, PriceRow]]
    trades: dict[int, dict[Symbol, list[Trade]]]
    observations: dict[int, ObservationRow]
    products: list[Symbol]
    profit_loss: dict[Symbol, float]


def create_backtest_data(
    round_num: int, day_num: int, prices: list[PriceRow], trades: list[Trade], observations: list[ObservationRow]
) -> BacktestData:
    prices_by_timestamp: dict[int, dict[Symbol, PriceRow]] = defaultdict(dict)
    for row in prices:
        prices_by_timestamp[row.timestamp][row.product] = row

    trades_by_timestamp: dict[int, dict[Symbol, list[Trade]]] = defaultdict(lambda: defaultdict(list))
    for trade in trades:
        trades_by_timestamp[trade.timestamp][trade.symbol].append(trade)

    products = sorted(set(row.product for row in prices))
    profit_loss = {product: 0.0 for product in products}

    observations_by_timestamp = {row.timestamp: row for row in observations}

    return BacktestData(
        round_num=round_num,
        day_num=day_num,
        prices=prices_by_timestamp,
        trades=trades_by_timestamp,
        observations=observations_by_timestamp,
        products=products,
        profit_loss=profit_loss,
    )


def has_day_data(file_reader: FileReader, round_num: int, day_num: int) -> bool:
    with file_reader.file([f"round{round_num}", f"prices_round_{round_num}_day_{day_num}.csv"]) as file:
        return file is not None


def read_day_data(file_reader: FileReader, round_num: int, day_num: int, no_names: bool) -> BacktestData:
    prices = []
    with file_reader.file([f"round{round_num}", f"prices_round_{round_num}_day_{day_num}.csv"]) as file:
        if file is None:
            raise ValueError(f"Prices data is not available for round {round_num} day {day_num}")

        for line in file.read_text(encoding="utf-8").splitlines()[1:]:
            columns = line.split(";")

            prices.append(
                PriceRow(
                    day=int(columns[0]),
                    timestamp=int(columns[1]),
                    product=columns[2],
                    bid_prices=get_column_values(columns, [3, 5, 7]),
                    bid_volumes=get_column_values(columns, [4, 6, 8]),
                    ask_prices=get_column_values(columns, [9, 11, 13]),
                    ask_volumes=get_column_values(columns, [10, 12, 14]),
                    mid_price=float(columns[15]),
                    profit_loss=float(columns[16]),
                )
            )

    trades = []
    with file_reader.file([f"round{round_num}", f"trades_round_{round_num}_day_{day_num}.csv"]) as file:
        if file is not None:
            for line in file.read_text(encoding="utf-8").splitlines()[1:]:
                columns = line.split(";")

                # Strip buyer/seller names if no_names is True
                buyer = "" if no_names else columns[1]
                seller = "" if no_names else columns[2]

                trades.append(
                    Trade(
                        symbol=columns[3],
                        price=int(float(columns[5])),
                        quantity=int(columns[6]),
                        buyer=buyer,
                        seller=seller,
                        timestamp=int(columns[0]),
                    )
                )

    observations = []
    with file_reader.file([f"round{round_num}", f"observations_round_{round_num}_day_{day_num}.csv"]) as file:
        if file is not None:
            for line in file.read_text(encoding="utf-8").splitlines()[1:]:
                columns = line.split(",")

                observations.append(
                    ObservationRow(
                        timestamp=int(columns[0]),
                        bidPrice=float(columns[1]),
                        askPrice=float(columns[2]),
                        transportFees=float(columns[3]),
                        exportTariff=float(columns[4]),
                        importTariff=float(columns[5]),
                        sugarPrice=float(columns[6]),
                        sunlightIndex=float(columns[7]),
                    )
                )

    return create_backtest_data(round_num, day_num, prices, trades, observations)
