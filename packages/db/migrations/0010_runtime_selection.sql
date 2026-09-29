-- NULL preserves the older boundary-probe dispatches, which predate policy selection.
ALTER TABLE attempts ADD COLUMN selection_context jsonb;
-- NULL/older incarnation means no complete report on the current connection.
-- This distinguishes an explicit empty report from an omitted legacy report.
ALTER TABLE runners ADD COLUMN runtime_report_incarnation bigint;
