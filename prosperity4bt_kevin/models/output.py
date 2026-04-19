import uuid

import orjson
from typing import Any
from dataclasses import dataclass
from prosperity4bt.datamodel import Trade


@dataclass
class SandboxLogRow:
    timestamp: int
    sandbox_log: str
    lambda_log: str

    def __init__(self, timestamp: int, sandbox_log: str, lambda_log: str):
        self.timestamp = timestamp
        self.sandbox_log = sandbox_log
        self.lambda_log = lambda_log

    def with_offset(self, timestamp_offset: int) -> "SandboxLogRow":
        return SandboxLogRow(
            self.timestamp + timestamp_offset,
            self.sandbox_log,
            self.lambda_log.replace(f"[[{self.timestamp},", f"[[{self.timestamp + timestamp_offset},"),
        )

    def __str__(self) -> str:
        return orjson.dumps(
            {
                "sandboxLog": self.sandbox_log,
                "lambdaLog": self.lambda_log,
                "timestamp": self.timestamp,
            },
            option=orjson.OPT_APPEND_NEWLINE | orjson.OPT_INDENT_2,
        ).decode("utf-8")

    def to_dict(self):
        return {
            "sandboxLog": self.sandbox_log,
            "lambdaLog": self.lambda_log,
            "timestamp": self.timestamp
        }


@dataclass
class ActivityLogRow:
    columns: list[Any]

    @property
    def timestamp(self) -> int:
        return self.columns[1]

    @property
    def symbol(self) -> str:
        return self.columns[2]

    @property
    def profit_loss(self) -> float:
        return self.columns[-1]

    def with_offset(self, timestamp_offset: int, profit_loss_offset: float) -> "ActivityLogRow":
        new_columns = self.columns[:]
        new_columns[1] += timestamp_offset
        new_columns[-1] += profit_loss_offset

        return ActivityLogRow(new_columns)

    def __str__(self) -> str:
        return ";".join(map(str, self.columns))

    @staticmethod
    def get_header_str() -> str:
        return 'day;timestamp;product;bid_price_1;bid_volume_1;bid_price_2;bid_volume_2;bid_price_3;bid_volume_3;ask_price_1;ask_volume_1;ask_price_2;ask_volume_2;ask_price_3;ask_volume_3;mid_price;profit_and_loss'


@dataclass
class TradeRow:
    trade: Trade

    @property
    def timestamp(self) -> int:
        return self.trade.timestamp

    def with_offset(self, timestamp_offset: int) -> "TradeRow":
        return TradeRow(
            Trade(
                self.trade.symbol,
                self.trade.price,
                self.trade.quantity,
                self.trade.buyer,
                self.trade.seller,
                self.trade.timestamp + timestamp_offset,
            )
        )

    def to_dict(self):
        return {
            "timestamp": self.trade.timestamp,
            "buyer": self.trade.buyer,
            "seller": self.trade.seller,
            "symbol": self.trade.symbol,
            "currency": "XIRECS",
            "price": float(self.trade.price),
            "quantity": self.trade.quantity,
        }

    def __str__(self) -> str:
        return (
            "  "
            + f"""
  {{
    "timestamp": {self.trade.timestamp},
    "buyer": "{self.trade.buyer}",
    "seller": "{self.trade.seller}",
    "symbol": "{self.trade.symbol}",
    "currency": "XIRECS",
    "price": {self.trade.price},
    "quantity": {self.trade.quantity},
  }}
        """.strip()
        )


@dataclass
class BacktestResult:
    round_num: int
    day_num: int
    sandbox_logs: list[SandboxLogRow]
    activity_logs: list[ActivityLogRow]
    trades: list[TradeRow]

    def __init__(self, round_num: int, day_num: int, sandbox_logs: list[SandboxLogRow]=None, activity_logs: list[ActivityLogRow]=None, trades: list[TradeRow]=None):
        self.round_num = round_num
        self.day_num = day_num
        self.sandbox_logs = sandbox_logs if sandbox_logs is not None else []
        self.activity_logs = activity_logs if activity_logs is not None else []
        self.trades = trades if trades is not None else []

    # return a list of activities that happened at the end of the day, i.e. last timestamp
    def final_activities(self) -> list[ActivityLogRow]:
        last_time_stamp = self.activity_logs[-1].timestamp
        return [activity for activity in self.activity_logs if activity.timestamp == last_time_stamp]


    def to_dict(self) -> dict:
        return {
            "submissionId": str(uuid.uuid4()),
            "activitiesLog": ActivityLogRow.get_header_str() + '\n' +'\n'.join([str(al) for al in self.activity_logs]),
            "logs": [sl.to_dict() for sl in self.sandbox_logs],
            "tradeHistory": [t.to_dict() for t in self.trades]
        }