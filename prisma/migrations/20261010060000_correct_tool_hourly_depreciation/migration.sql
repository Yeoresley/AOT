UPDATE `MachineTool`
SET
    `thdUsd` = `valueUsd` * `depreciationRate` / 2304,
    `thdCup` = `valueCup` * `depreciationRate` / 2304;
