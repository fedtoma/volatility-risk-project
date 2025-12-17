from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import squareform
import pandas as pd

def cluster_matrix(matrix: pd.DataFrame) -> (pd.DataFrame, list):
    if matrix.shape[0] <= 2:
        return matrix, list(matrix.columns)

    if (matrix.values >= -1).all() and (matrix.values <= 1).all():
        dist = 1 - matrix
    else:
        dist = matrix.max().max() - matrix

    dist_condensed = squareform(dist.values, checks=False)
    linkage_matrix = linkage(dist_condensed, method="average")
    leaf_order = leaves_list(linkage_matrix)

    reordered = matrix.iloc[leaf_order, leaf_order]
    return reordered, list(reordered.columns)
