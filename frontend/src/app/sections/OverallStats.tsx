import React from "react";
import styles from "../styles/OverallStats.module.css";

interface OverallStatsProps {
  summary: string;
  risk?: "Low" | "Moderate" | "High";
  performance?: "Underperform" | "Neutral" | "Outperform";
  signal?: "Cautious Buy" | "Hold" | "Reduce Exposure";
  loading?: boolean;
}

const OverallStats: React.FC<OverallStatsProps> = ({ summary, risk, performance, signal, loading = false }) => {
  return (
    <div className={styles.container}>
      <div className={styles.column1}>
        <div className={styles.mainText}>Overall Risk & Performance</div>
        <div className={styles.subText}>AI summary:</div>
        <div className={styles.summaryContainer}>
          <div className={styles.summary}>
            <div className={styles.subsubText} style={{ whiteSpace: "pre-wrap" }}>
              {summary ? summary : loading ? "Loading AI summary..." : ""}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.column2}>
        {/* Right column: badges */}
        <div className={styles.badgesColumn}>
          <span className={styles.badge}>
            <span className={styles.subText}>Risk:</span>{" "}
            <span
              className={
                risk === "Low"
                  ? styles.badgeRiskLow
                  : risk === "Moderate"
                    ? styles.badgeRiskModerate
                    : risk === "High"
                      ? styles.badgeRiskHigh
                      : ""
              }
            >
              {risk ?? "—"}
            </span>
          </span>

          <span className={styles.badge}>
            <span className={styles.subText}>Performance:</span>{" "}
            <span
              className={
                performance === "Underperform"
                  ? styles.badgePerformanceUnderperform
                  : performance === "Neutral"
                    ? styles.badgePerformanceNeutral
                    : performance === "Outperform"
                      ? styles.badgePerformanceOutperform
                      : ""
              }
            >
              {performance ?? "—"}
            </span>
          </span>

          <span className={styles.badge}>
            <span className={styles.subText}>Signal:</span>{" "}
            <span className={signal ? styles.badgeSignal : ""}>{signal ?? "—"}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default OverallStats;
