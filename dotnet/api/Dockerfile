FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS builder
WORKDIR /src
COPY shared/ ./shared/
COPY api/ ./api/
RUN dotnet publish api/ZyxxyzApi.csproj -c Release -o /publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine
WORKDIR /app
COPY --from=builder /publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "ZyxxyzApi.dll"]
