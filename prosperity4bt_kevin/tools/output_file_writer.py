import json
from pathlib import Path
from prosperity4bt.models.output import BacktestResult


class OutputFileWriter:

    @staticmethod
    def write_to_file(output_file: Path, result: BacktestResult):
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with output_file.open("w+", encoding="utf-8") as file:
            file.write(json.dumps(result.to_dict()))