export const paginate = async (prismaModel, whereClause, reqQuery, include = null, orderBy = null) => {
  const limit = parseInt(reqQuery.limit) || 50;
  const page = parseInt(reqQuery.page) || 1;
  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    prismaModel.count({ where: whereClause }),
    prismaModel.findMany({
      where: whereClause,
      take: limit,
      skip,
      ...(include ? { include } : {}),
      ...(orderBy ? { orderBy } : {}),
    })
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};
