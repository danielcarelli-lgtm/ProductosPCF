import {IInputs, IOutputs} from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
type DataSet = ComponentFramework.WebApi.Entity;

type SortField = "name" | "createdon" | "pending";

interface TranslationDictionary {
    [key: string]: string;
}

interface ProductStatusSummary {
    total: number;
    pending: number;
    installed: number;
    returned: number;
}

export class ProjectProductsManager implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private _context: ComponentFramework.Context<IInputs>;
    private _container: HTMLDivElement;
    private _leftPanel: HTMLDivElement;
    private _rightPanel: HTMLDivElement;
    private _versionElement: HTMLDivElement;
    private _resizeHandler: () => void;

    // Estado 
    private _selectedProductId: string | null = null;
    private _selectedProductEstimatedQty: number = 0;
    private _currentLines: any[] = [];
    private _productCounts: Record<string, ProductStatusSummary> = {};
    private _lastDatasetIds: string = "";
    
    // Estado de ordenación del panel izquierdo
    private _sortBy: SortField = "name";
    private _sortAsc: boolean = true;
    
    private _currentBaseNameSuggestion: string = "";
    
    private readonly VERSION = "v0.0.21";

    // Valores del OptionSet sec_estadodelproducto
    private readonly STATUS_PENDIENTE = 909540000;
    private readonly STATUS_INSTALADO = 909540001;
    private readonly STATUS_DEVOLUCION = 909540002;

    // Diccionario de respaldo por LCID (1034: es-ES, 2070: pt-PT, 1033: en-US)
    private readonly TRANSLATIONS: Record<number, TranslationDictionary> = {
        1034: {
            LeftPanelTitle: "Productos de Proyecto",
            BtnNew: "+ Nuevo",
            BtnNewTooltip: "Crear nuevo Producto de Proyecto",
            SortLabel: "Ordenar:",
            SortName: "Nombre",
            SortCreatedOn: "Fecha creación",
            SortPending: "Pendientes",
            NoName: "Sin nombre",
            EditTooltip: "Editar Producto de Proyecto",
            LinesCreatedBadge: "Líneas creadas: {0} / Estimadas: {1}",
            SummaryInstalled: "Instalado: {0}",
            SummaryPending: "Pendiente: {0}",
            SummaryReturned: "Devolución: {0}",
            LoadingLines: "Cargando líneas...",
            SelectProductPrompt: "Seleccione un producto para ver sus líneas.",
            ErrorLoadingLines: "Error al cargar las líneas.",
            RightPanelTitle: "Líneas de Producto Asociadas",
            BaseNamePlaceholder: "Nombre base (ej. Cámara)",
            BtnCreateOne: "Crear línea (1)",
            BtnCreateMissing: "Crear faltantes ({0})",
            EstimatedReached: "✓ Cantidad estimada alcanzada",
            EstimatedExceeded: "⚠ Cantidad estimada superada (+{0})",
            ColLineName: "Línea de producto",
            ColStatus: "Estado",
            ColSerial: "Nº Serie",
            ColLocation: "Ubicación",
            PlaceholderName: "Nombre",
            NoStatus: "Sin estado",
            StatusPending: "Pendiente",
            StatusInstalled: "Instalado",
            StatusReturned: "Devolución",
            PlaceholderSerial: "Nº Serie",
            PlaceholderLocation: "Ubicación",
            AlertMissingBaseName: "Por favor, complete el Nombre base para poder crear líneas.",
            AlertErrorCreatingLines: "Error al crear líneas. Revisa la consola.",
            CurrentProjectFallback: "Proyecto Actual"
        },
        2070: {
            LeftPanelTitle: "Produtos de Projeto",
            BtnNew: "+ Novo",
            BtnNewTooltip: "Criar novo Produto de Projeto",
            SortLabel: "Ordenar:",
            SortName: "Nome",
            SortCreatedOn: "Data de criação",
            SortPending: "Pendentes",
            NoName: "Sem nome",
            EditTooltip: "Editar Produto de Projeto",
            LinesCreatedBadge: "Linhas criadas: {0} / Estimadas: {1}",
            SummaryInstalled: "Instalado: {0}",
            SummaryPending: "Pendente: {0}",
            SummaryReturned: "Devolução: {0}",
            LoadingLines: "A carregar linhas...",
            SelectProductPrompt: "Selecione um produto para ver as suas linhas.",
            ErrorLoadingLines: "Erro ao carregar as linhas.",
            RightPanelTitle: "Linhas de Produto Associadas",
            BaseNamePlaceholder: "Nome base (ex. Câmara)",
            BtnCreateOne: "Criar linha (1)",
            BtnCreateMissing: "Criar em falta ({0})",
            EstimatedReached: "✓ Quantidade estimada atingida",
            EstimatedExceeded: "⚠ Quantidade estimada excedida (+{0})",
            ColLineName: "Linha de produto",
            ColStatus: "Estado",
            ColSerial: "Nº Série",
            ColLocation: "Localização",
            PlaceholderName: "Nome",
            NoStatus: "Sem estado",
            StatusPending: "Pendente",
            StatusInstalled: "Instalado",
            StatusReturned: "Devolução",
            PlaceholderSerial: "Nº Série",
            PlaceholderLocation: "Localização",
            AlertMissingBaseName: "Por favor, preencha o Nome base para poder criar linhas.",
            AlertErrorCreatingLines: "Erro ao criar linhas. Verifique a consola.",
            CurrentProjectFallback: "Projeto Atual"
        },
        1033: {
            LeftPanelTitle: "Project Products",
            BtnNew: "+ New",
            BtnNewTooltip: "Create new Project Product",
            SortLabel: "Sort:",
            SortName: "Name",
            SortCreatedOn: "Created date",
            SortPending: "Pending",
            NoName: "No name",
            EditTooltip: "Edit Project Product",
            LinesCreatedBadge: "Created lines: {0} / Estimated: {1}",
            SummaryInstalled: "Installed: {0}",
            SummaryPending: "Pending: {0}",
            SummaryReturned: "Return: {0}",
            LoadingLines: "Loading lines...",
            SelectProductPrompt: "Select a product to view its lines.",
            ErrorLoadingLines: "Error loading lines.",
            RightPanelTitle: "Associated Product Lines",
            BaseNamePlaceholder: "Base name (e.g. Camera)",
            BtnCreateOne: "Create line (1)",
            BtnCreateMissing: "Create missing ({0})",
            EstimatedReached: "✓ Estimated quantity reached",
            EstimatedExceeded: "⚠ Estimated quantity exceeded (+{0})",
            ColLineName: "Product Line",
            ColStatus: "Status",
            ColSerial: "Serial No.",
            ColLocation: "Location",
            PlaceholderName: "Name",
            NoStatus: "No status",
            StatusPending: "Pending",
            StatusInstalled: "Installed",
            StatusReturned: "Return",
            PlaceholderSerial: "Serial No.",
            PlaceholderLocation: "Location",
            AlertMissingBaseName: "Please fill in the Base name to create lines.",
            AlertErrorCreatingLines: "Error creating lines. Check the console.",
            CurrentProjectFallback: "Current Project"
        }
    };

    // =======================================================================
    // NOMBRES LÓGICOS
    // =======================================================================
    private readonly LOGICAL_NAME_PADRE_ENTIDAD = "sec_productodeproyecto"; 
    private readonly LOGICAL_NAME_NOMBRE_PADRE = "sec_nombre"; 
    private readonly LOGICAL_NAME_FECHA_CREACION = "createdon";
    private readonly LOGICAL_NAME_NUMERO_PRODUCTO = "a_268d74c4a6744c079367357c0ab2686a.productnumber"; 
    private readonly LOGICAL_NAME_PRODUCTO_ASOCIADO_NOMBRE = "sec_productoid"; 
    private readonly LOGICAL_NAME_CANTIDAD_ESTIMADA = "sec_cantidadestimada"; 
    
    private readonly LOGICAL_NAME_LINEA_ENTIDAD = "sec_lineadeproductodeproyecto"; 
    private readonly LOGICAL_NAME_NOMBRE_HIJO = "sec_name"; 
    private readonly LOGICAL_NAME_NUMERO_SERIE = "sec_numerodeserie";
    private readonly LOGICAL_NAME_UBICACION = "sec_descripciondelaubicacion";
    private readonly LOGICAL_NAME_ESTADO_PRODUCTO = "sec_estadodelproducto";
    
    private readonly LOGICAL_NAME_LOOKUP_PRODUCTO = "sec_productodeproyectoid"; 
    private readonly LOGICAL_NAME_ENTIDAD_PADRE_PLURAL = "sec_productodeproyectos"; 
    // =======================================================================

    constructor() {}

    private t(key: string, ...args: (string | number)[]): string {
        let text = "";
        try {
            if (this._context && this._context.resources) {
                const res = this._context.resources.getString(key);
                if (res && res !== key) {
                    text = res;
                }
            }
        } catch {
            // Ignorar fallo en arnés local y usar diccionario interno
        }

        if (!text) {
            const lcid = this._context?.userSettings?.languageId || 1034;
            const dict = this.TRANSLATIONS[lcid] || this.TRANSLATIONS[1034];
            text = dict[key] || this.TRANSLATIONS[1034][key] || key;
        }

        args.forEach((arg, idx) => {
            text = text.replace(`{${idx}}`, String(arg));
        });

        return text;
    }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._context = context;
        this._container = container;

        // Habilitar seguimiento de redimensionado del contenedor en Power Apps
        this._context.mode.trackContainerResize(true);

        this._container.className = "pcf-main-container";

        this._leftPanel = document.createElement("div");
        this._leftPanel.className = "pcf-left-panel";

        this._rightPanel = document.createElement("div");
        this._rightPanel.className = "pcf-right-panel";
        
        this._versionElement = document.createElement("div");
        this._versionElement.className = "pcf-version";
        this._versionElement.innerText = this.VERSION;

        this._container.appendChild(this._leftPanel);
        this._container.appendChild(this._rightPanel);
        this._container.appendChild(this._versionElement);

        this._resizeHandler = () => this.adjustContainerHeight();
        window.addEventListener("resize", this._resizeHandler);
        this.adjustContainerHeight();
    }

    private adjustContainerHeight(): void {
        if (!this._container) return;

        requestAnimationFrame(() => {
            const rect = this._container.getBoundingClientRect();
            if (rect.top > 0) {
                // Calcula el espacio exacto desde el inicio del componente hasta el final de la ventana
                const bottomPadding = 20;
                const availableHeight = Math.max(320, window.innerHeight - rect.top - bottomPadding);
                this._container.style.height = `${availableHeight}px`;
            }
        });
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        this.adjustContainerHeight();

        const dataset = context.parameters.projectProductsDataset;

        if (dataset.loading) return;

        // Auto-paginación para cargar todos los registros
        if (dataset.paging && dataset.paging.hasNextPage) {
            dataset.paging.loadNextPage();
            return;
        }

        const currentIds = dataset.sortedRecordIds.join(",");
        
        if (currentIds !== this._lastDatasetIds && dataset.sortedRecordIds.length > 0) {
            this._lastDatasetIds = currentIds;
            this.fetchCounts(dataset);
        } else {
            this.renderLeftPanel(dataset);
        }
    }

    private fetchCounts(dataset: ComponentFramework.PropertyTypes.DataSet): void {
        const ids = dataset.sortedRecordIds;
        if (ids.length === 0) {
            this.renderLeftPanel(dataset);
            return;
        }

        const valuesXml = ids.map(id => `<value>${id}</value>`).join('');
        
        const fetchXml = `
        <fetch aggregate="true">
          <entity name="${this.LOGICAL_NAME_LINEA_ENTIDAD}">
            <attribute name="${this.LOGICAL_NAME_LOOKUP_PRODUCTO}" alias="productid" groupby="true" />
            <attribute name="${this.LOGICAL_NAME_ESTADO_PRODUCTO}" alias="status" groupby="true" />
            <attribute name="${this.LOGICAL_NAME_LINEA_ENTIDAD}id" alias="count" aggregate="count" />
            <filter type="and">
              <condition attribute="${this.LOGICAL_NAME_LOOKUP_PRODUCTO}" operator="in">
                ${valuesXml}
              </condition>
              <condition attribute="statecode" operator="eq" value="0" />
            </filter>
          </entity>
        </fetch>`;

        this._context.webAPI.retrieveMultipleRecords(this.LOGICAL_NAME_LINEA_ENTIDAD, "?fetchXml=" + encodeURIComponent(fetchXml))
            .then(response => {
                const newCounts: Record<string, ProductStatusSummary> = {};
                ids.forEach(id => {
                    newCounts[id] = { total: 0, pending: 0, installed: 0, returned: 0 };
                });

                response.entities.forEach(entity => {
                    const productId = entity["productid"] || entity[`_${this.LOGICAL_NAME_LOOKUP_PRODUCTO}_value`];
                    const statusVal = entity["status"] !== undefined && entity["status"] !== null ? parseInt(entity["status"], 10) : null;
                    const count = entity["count"] !== undefined ? parseInt(entity["count"], 10) : 0;

                    if (productId && newCounts[productId]) {
                        newCounts[productId].total += count;
                        if (statusVal === this.STATUS_INSTALADO) {
                            newCounts[productId].installed += count;
                        } else if (statusVal === this.STATUS_DEVOLUCION) {
                            newCounts[productId].returned += count;
                        } else {
                            newCounts[productId].pending += count;
                        }
                    }
                });

                this._productCounts = newCounts;
                this.renderLeftPanel(dataset);
            })
            .catch((err: any) => {
                console.error("Error al obtener conteos agregados", err);
                this.renderLeftPanel(dataset);
            });
    }

    private handleSortChange(field: SortField, dataset: ComponentFramework.PropertyTypes.DataSet): void {
        if (this._sortBy === field) {
            this._sortAsc = !this._sortAsc;
        } else {
            this._sortBy = field;
            this._sortAsc = (field === "name");
        }
        this.renderLeftPanel(dataset);
    }

    private getSortedRecordIds(dataset: ComponentFramework.PropertyTypes.DataSet): string[] {
        const ids = [...dataset.sortedRecordIds];

        ids.sort((idA, idB) => {
            const recA = dataset.records[idA];
            const recB = dataset.records[idB];

            let comparison = 0;

            if (this._sortBy === "name") {
                const nameA = (recA.getFormattedValue(this.LOGICAL_NAME_NOMBRE_PADRE) || "").toLowerCase();
                const nameB = (recB.getFormattedValue(this.LOGICAL_NAME_NOMBRE_PADRE) || "").toLowerCase();
                comparison = nameA.localeCompare(nameB);
            } else if (this._sortBy === "createdon") {
                const rawDateA = recA.getValue(this.LOGICAL_NAME_FECHA_CREACION) || recA.getFormattedValue(this.LOGICAL_NAME_FECHA_CREACION);
                const rawDateB = recB.getValue(this.LOGICAL_NAME_FECHA_CREACION) || recB.getFormattedValue(this.LOGICAL_NAME_FECHA_CREACION);
                const timeA = rawDateA ? new Date(rawDateA as any).getTime() : 0;
                const timeB = rawDateB ? new Date(rawDateB as any).getTime() : 0;
                comparison = timeA - timeB;
            } else if (this._sortBy === "pending") {
                const estAStr = recA.getValue(this.LOGICAL_NAME_CANTIDAD_ESTIMADA);
                const estBStr = recB.getValue(this.LOGICAL_NAME_CANTIDAD_ESTIMADA);
                const estA = estAStr ? parseInt(estAStr as string, 10) : 0;
                const estB = estBStr ? parseInt(estBStr as string, 10) : 0;

                const creadasA = this._productCounts[idA] ? this._productCounts[idA].total : 0;
                const creadasB = this._productCounts[idB] ? this._productCounts[idB].total : 0;

                const pendingA = estA - creadasA;
                const pendingB = estB - creadasB;
                comparison = pendingA - pendingB;
            }

            return this._sortAsc ? comparison : -comparison;
        });

        return ids;
    }

    private renderLeftPanel(dataset: ComponentFramework.PropertyTypes.DataSet): void {
        const previousScrollTop = this._leftPanel.scrollTop;
        this._leftPanel.innerHTML = ""; 

        const allowEdit = (this._context.parameters as any).allowEdit?.raw === true || (this._context.parameters as any).allowEdit?.raw === "true";

        // Contenedor fijo superior del panel izquierdo
        const stickyHeader = document.createElement("div");
        stickyHeader.className = "pcf-left-sticky-header";

        const headerContainer = document.createElement("div");
        headerContainer.className = "pcf-left-header";
        
        const title = document.createElement("h3");
        title.className = "pcf-left-title";
        title.innerText = this.t("LeftPanelTitle");
        
        const btnAdd = document.createElement("button");
        btnAdd.type = "button"; 
        btnAdd.className = "pcf-btn-add";
        btnAdd.innerText = this.t("BtnNew");
        btnAdd.title = this.t("BtnNewTooltip");
        btnAdd.onclick = () => this.openNewRecordModal();

        headerContainer.appendChild(title);
        headerContainer.appendChild(btnAdd);
        stickyHeader.appendChild(headerContainer);

        // Barra de ordenación dentro de la cabecera fija
        const sortBar = document.createElement("div");
        sortBar.className = "pcf-sort-bar";

        const sortLabel = document.createElement("span");
        sortLabel.className = "pcf-sort-label";
        sortLabel.innerText = this.t("SortLabel");
        sortBar.appendChild(sortLabel);

        const sortOptions: { field: SortField; label: string }[] = [
            { field: "name", label: this.t("SortName") },
            { field: "createdon", label: this.t("SortCreatedOn") },
            { field: "pending", label: this.t("SortPending") }
        ];

        sortOptions.forEach(opt => {
            const btnSort = document.createElement("button");
            btnSort.type = "button";
            btnSort.className = "pcf-btn-sort";
            if (this._sortBy === opt.field) {
                btnSort.classList.add("active");
                const arrow = this._sortAsc ? " ↑" : " ↓";
                btnSort.innerText = `${opt.label}${arrow}`;
            } else {
                btnSort.innerText = opt.label;
            }
            btnSort.onclick = () => this.handleSortChange(opt.field, dataset);
            sortBar.appendChild(btnSort);
        });

        stickyHeader.appendChild(sortBar);
        this._leftPanel.appendChild(stickyHeader);

        const sortedIds = this.getSortedRecordIds(dataset);

        sortedIds.forEach(recordId => {
            const record = dataset.records[recordId];

            const nombre = record.getFormattedValue(this.LOGICAL_NAME_NOMBRE_PADRE) || this.t("NoName");
            const numeroProducto = record.getFormattedValue(this.LOGICAL_NAME_NUMERO_PRODUCTO) || "--";
            const nombreAsociado = record.getFormattedValue(this.LOGICAL_NAME_PRODUCTO_ASOCIADO_NOMBRE) || "--";
            
            const cantidadEstimadaStr = record.getValue(this.LOGICAL_NAME_CANTIDAD_ESTIMADA);
            const cantidadEstimada = cantidadEstimadaStr ? parseInt(cantidadEstimadaStr as string, 10) : 0;
            const summary = this._productCounts[recordId] || { total: 0, pending: 0, installed: 0, returned: 0 };
            const cantidadCreada = summary.total;

            const card = document.createElement("div");
            card.className = "pcf-card";
            
            if (this._selectedProductId === recordId) {
                card.classList.add("selected");
            }

            const cardHeader = document.createElement("div");
            cardHeader.className = "pcf-card-header";

            const cardTitle = document.createElement("div");
            cardTitle.className = "pcf-card-title";
            cardTitle.innerText = nombre;

            cardHeader.appendChild(cardTitle);

            if (allowEdit) {
                const btnEdit = document.createElement("button");
                btnEdit.type = "button";
                btnEdit.className = "pcf-btn-edit";
                btnEdit.innerHTML = "&#9998;"; 
                btnEdit.title = this.t("EditTooltip");
                btnEdit.onclick = (e) => {
                    e.stopPropagation(); 
                    this.openEditRecordModal(recordId);
                };
                cardHeader.appendChild(btnEdit);
            }

            // Fila de insignias: Conteo total
            const badgesRow = document.createElement("div");
            badgesRow.className = "pcf-card-badges-row";

            const cardQty = document.createElement("span");
            cardQty.className = "pcf-qty-badge";
            cardQty.innerText = this.t("LinesCreatedBadge", cantidadCreada, cantidadEstimada);
            
            if (cantidadCreada < cantidadEstimada) {
                cardQty.classList.add("low");
            } else if (cantidadCreada === cantidadEstimada) {
                cardQty.classList.add("exact");
            } else {
                cardQty.classList.add("high");
            }
            badgesRow.appendChild(cardQty);

            // Resumen de estados con colores pastel
            const statusSummaryContainer = document.createElement("div");
            statusSummaryContainer.className = "pcf-status-summary";

            const pillInstalled = document.createElement("span");
            pillInstalled.className = "pcf-status-pill status-installed";
            pillInstalled.innerText = this.t("SummaryInstalled", summary.installed);

            const pillPending = document.createElement("span");
            pillPending.className = "pcf-status-pill status-pending";
            pillPending.innerText = this.t("SummaryPending", summary.pending);

            const pillReturned = document.createElement("span");
            pillReturned.className = "pcf-status-pill status-returned";
            pillReturned.innerText = this.t("SummaryReturned", summary.returned);

            statusSummaryContainer.appendChild(pillInstalled);
            statusSummaryContainer.appendChild(pillPending);
            statusSummaryContainer.appendChild(pillReturned);

            const cardNum = document.createElement("div");
            cardNum.className = "pcf-card-num";
            cardNum.innerText = `${nombreAsociado} (#${numeroProducto})`;

            card.appendChild(cardHeader);
            card.appendChild(badgesRow);
            card.appendChild(statusSummaryContainer);
            card.appendChild(cardNum);

            card.onclick = () => {
                if (this._selectedProductId !== recordId) {
                    this._currentBaseNameSuggestion = ""; 
                }
                this._selectedProductId = recordId;
                this._selectedProductEstimatedQty = cantidadEstimada;
                this.renderLeftPanel(dataset); 
                this.loadRightPanel();
            };

            this._leftPanel.appendChild(card);
        });

        this._leftPanel.scrollTop = previousScrollTop;
    }

    private loadRightPanel(): void {
        this._rightPanel.innerHTML = this.t("LoadingLines");

        if (!this._selectedProductId) {
            this._rightPanel.innerHTML = this.t("SelectProductPrompt");
            return;
        }

        const query = `?$filter=_${this.LOGICAL_NAME_LOOKUP_PRODUCTO}_value eq ${this._selectedProductId} and statecode eq 0`;

        this._context.webAPI.retrieveMultipleRecords(this.LOGICAL_NAME_LINEA_ENTIDAD, query).then(
            (response) => {
                this._currentLines = response.entities;
                this.renderRightPanel();
            },
            (error: any) => {
                console.error("Error al recuperar líneas", error);
                this._rightPanel.innerHTML = this.t("ErrorLoadingLines");
            }
        );
    }

    private getStatusColorClass(statusValue: number | null): string {
        if (statusValue === this.STATUS_INSTALADO) {
            return "status-installed";
        } else if (statusValue === this.STATUS_DEVOLUCION) {
            return "status-returned";
        }
        return "status-pending";
    }

    private renderRightPanel(): void {
        this._rightPanel.innerHTML = "";

        // Contenedor fijo superior del panel derecho
        const stickyRightHeader = document.createElement("div");
        stickyRightHeader.className = "pcf-right-sticky-header";

        const title = document.createElement("h3");
        title.className = "pcf-right-title";
        title.innerText = this.t("RightPanelTitle");
        stickyRightHeader.appendChild(title);

        const count = this._currentLines.length;
        const missing = this._selectedProductEstimatedQty - count;

        const controlsDiv = document.createElement("div");
        controlsDiv.className = "pcf-right-controls";

        if (missing > 0) {
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = "pcf-input pcf-name-input";
            nameInput.placeholder = this.t("BaseNamePlaceholder");
            if (this._currentBaseNameSuggestion) {
                nameInput.value = this._currentBaseNameSuggestion;
            }
            controlsDiv.appendChild(nameInput);

            const btnsContainer = document.createElement("div");
            btnsContainer.className = "pcf-btns-container";

            const btnCreateOne = document.createElement("button");
            btnCreateOne.type = "button"; 
            btnCreateOne.className = "pcf-btn pcf-btn-secondary";
            btnCreateOne.innerText = this.t("BtnCreateOne");
            btnCreateOne.onclick = () => this.createLines(nameInput.value, 1);
            btnsContainer.appendChild(btnCreateOne);

            const btnCreateAll = document.createElement("button");
            btnCreateAll.type = "button"; 
            btnCreateAll.className = "pcf-btn pcf-btn-primary";
            btnCreateAll.innerText = this.t("BtnCreateMissing", missing);
            btnCreateAll.onclick = () => this.createLines(nameInput.value, missing);
            btnsContainer.appendChild(btnCreateAll);

            controlsDiv.appendChild(btnsContainer);
        } else if (missing === 0) {
            const successMsg = document.createElement("span");
            successMsg.className = "pcf-success-msg";
            successMsg.innerText = this.t("EstimatedReached");
            controlsDiv.appendChild(successMsg);
        } else {
            const exceededMsg = document.createElement("span");
            exceededMsg.className = "pcf-exceeded-msg";
            exceededMsg.innerText = this.t("EstimatedExceeded", Math.abs(missing));
            controlsDiv.appendChild(exceededMsg);
        }

        stickyRightHeader.appendChild(controlsDiv);

        if (this._currentLines.length > 0) {
            const headerRow = document.createElement("div");
            headerRow.className = "pcf-lines-header";

            const hNum = document.createElement("span");
            hNum.innerText = "#";
            
            const hName = document.createElement("span");
            hName.innerText = this.t("ColLineName");
            
            const hState = document.createElement("span");
            hState.innerText = this.t("ColStatus");
            
            const hSerial = document.createElement("span");
            hSerial.innerText = this.t("ColSerial");

            const hLocation = document.createElement("span");
            hLocation.innerText = this.t("ColLocation");

            headerRow.appendChild(hNum);
            headerRow.appendChild(hName);
            headerRow.appendChild(hState);
            headerRow.appendChild(hSerial);
            headerRow.appendChild(hLocation);
            stickyRightHeader.appendChild(headerRow);
        }

        this._rightPanel.appendChild(stickyRightHeader);

        const list = document.createElement("ul");
        list.className = "pcf-lines-list";

        this._currentLines.forEach((linea, index) => {
            const li = document.createElement("li");
            li.className = "pcf-line-item";

            const lineId = linea[this.LOGICAL_NAME_LINEA_ENTIDAD + "id"];

            // 0. Orden
            const numSpan = document.createElement("span");
            numSpan.className = "pcf-line-num";
            numSpan.innerText = (index + 1).toString();

            // 1. Nombre Editable
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = "pcf-input pcf-line-name-input";
            nameInput.value = linea[this.LOGICAL_NAME_NOMBRE_HIJO] || "";
            nameInput.placeholder = this.t("PlaceholderName");

            nameInput.onblur = () => {
                this.updateLineField(linea, lineId, this.LOGICAL_NAME_NOMBRE_HIJO, nameInput);
            };

            // 2. Selector de Estado Editable con bloqueo cuando está Instalado
            const rawStatus = linea[this.LOGICAL_NAME_ESTADO_PRODUCTO];
            const currentStatus: number = rawStatus !== undefined && rawStatus !== null ? parseInt(rawStatus, 10) : this.STATUS_PENDIENTE;

            const estadoSelect = document.createElement("select");
            estadoSelect.className = `pcf-estado-select ${this.getStatusColorClass(currentStatus)}`;

            // Si está Instalado, no se puede cambiar de estado
            if (currentStatus === this.STATUS_INSTALADO) {
                estadoSelect.disabled = true;
            }

            const statusOptions = [
                { value: this.STATUS_PENDIENTE, label: this.t("StatusPending") },
                { value: this.STATUS_INSTALADO, label: this.t("StatusInstalled") },
                { value: this.STATUS_DEVOLUCION, label: this.t("StatusReturned") }
            ];

            statusOptions.forEach(opt => {
                const optionElem = document.createElement("option");
                optionElem.value = opt.value.toString();
                optionElem.innerText = opt.label;
                if (opt.value === currentStatus) {
                    optionElem.selected = true;
                }
                estadoSelect.appendChild(optionElem);
            });

            estadoSelect.onchange = () => {
                const newStatus = parseInt(estadoSelect.value, 10);
                estadoSelect.className = `pcf-estado-select ${this.getStatusColorClass(newStatus)} saving`;

                const data = { [this.LOGICAL_NAME_ESTADO_PRODUCTO]: newStatus };
                this._context.webAPI.updateRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, lineId, data)
                    .then(() => {
                        linea[this.LOGICAL_NAME_ESTADO_PRODUCTO] = newStatus;
                        estadoSelect.classList.remove("saving");
                        estadoSelect.classList.add("saved");

                        // Bloquear inmediatamente si pasa a estado Instalado
                        if (newStatus === this.STATUS_INSTALADO) {
                            estadoSelect.disabled = true;
                        }

                        setTimeout(() => estadoSelect.classList.remove("saved"), 1200);

                        // Refrescar resumen de estados en las tarjetas de la izquierda
                        const dataset = this._context.parameters.projectProductsDataset;
                        this.fetchCounts(dataset);
                    })
                    .catch((e: any) => {
                        estadoSelect.classList.remove("saving");
                        estadoSelect.classList.add("error");
                        console.error("Error actualizando estado de la línea", e);
                    });
            };

            // 3. Nº Serie Editable
            const serialInput = document.createElement("input");
            serialInput.type = "text";
            serialInput.className = "pcf-input pcf-serial-input";
            serialInput.placeholder = this.t("PlaceholderSerial");
            serialInput.value = linea[this.LOGICAL_NAME_NUMERO_SERIE] || "";
            
            serialInput.onblur = () => {
                this.updateLineField(linea, lineId, this.LOGICAL_NAME_NUMERO_SERIE, serialInput);
            };

            // 4. Ubicación Editable
            const locationInput = document.createElement("input");
            locationInput.type = "text";
            locationInput.className = "pcf-input pcf-location-input";
            locationInput.placeholder = this.t("PlaceholderLocation");
            locationInput.value = linea[this.LOGICAL_NAME_UBICACION] || "";

            locationInput.onblur = () => {
                this.updateLineField(linea, lineId, this.LOGICAL_NAME_UBICACION, locationInput);
            };

            li.appendChild(numSpan);
            li.appendChild(nameInput);
            li.appendChild(estadoSelect);
            li.appendChild(serialInput);
            li.appendChild(locationInput);
            list.appendChild(li);
        });

        this._rightPanel.appendChild(list);
    }

    private updateLineField(linea: any, lineId: string, fieldLogicalName: string, inputElem: HTMLInputElement): void {
        const newVal = inputElem.value.trim();
        const oldVal = linea[fieldLogicalName] || "";
        if (newVal !== oldVal) {
            inputElem.classList.add("saving");
            const data = { [fieldLogicalName]: newVal };
            this._context.webAPI.updateRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, lineId, data)
                .then(() => {
                    inputElem.classList.remove("saving");
                    inputElem.classList.add("saved");
                    linea[fieldLogicalName] = newVal;
                    setTimeout(() => inputElem.classList.remove("saved"), 1500);
                })
                .catch((e: any) => {
                    inputElem.classList.remove("saving");
                    inputElem.classList.add("error");
                    console.error(`Error actualizando ${fieldLogicalName}`, e);
                });
        }
    }

    private createLines(baseText: string, countToCreate: number): void {
        if (!this._selectedProductId || countToCreate <= 0) return;

        if (!baseText || baseText.trim() === "") {
            alert(this.t("AlertMissingBaseName"));
            return;
        }

        let baseName = baseText.trim();
        let prefix = baseName;
        
        const match = baseName.match(/^(.*?)(\s*\d+)$/);
        if (match) {
            prefix = match[1].trim();
        }

        let maxNum = 0;
        
        this._currentLines.forEach(l => {
            const n = l[this.LOGICAL_NAME_NOMBRE_HIJO] || "";
            if (n === prefix) {
                maxNum = Math.max(maxNum, 1);
            } else if (n.startsWith(prefix + " ")) {
                const numPart = n.substring(prefix.length + 1);
                const parsed = parseInt(numPart, 10);
                if (!isNaN(parsed)) {
                    maxNum = Math.max(maxNum, parsed);
                }
            } else if (n === baseName && match) {
                maxNum = Math.max(maxNum, parseInt(match[2].trim(), 10));
            }
        });

        let currentNum = 1;
        if (maxNum > 0) {
            currentNum = maxNum + 1;
        } else if (match) {
            currentNum = parseInt(match[2].trim(), 10);
        }

        const promises = [];

        for (let i = 0; i < countToCreate; i++) {
            const data: any = {};
            data[`${this.LOGICAL_NAME_LOOKUP_PRODUCTO}@odata.bind`] = `/${this.LOGICAL_NAME_ENTIDAD_PADRE_PLURAL}(${this._selectedProductId})`;
            data[this.LOGICAL_NAME_NOMBRE_HIJO] = `${prefix} ${currentNum}`;
            data[this.LOGICAL_NAME_ESTADO_PRODUCTO] = this.STATUS_PENDIENTE;
            promises.push(this._context.webAPI.createRecord(this.LOGICAL_NAME_LINEA_ENTIDAD, data));
            currentNum++;
        }

        Promise.all(promises).then(() => {
            this._currentBaseNameSuggestion = `${prefix} ${currentNum}`;
            this.loadRightPanel();
            
            const dataset = this._context.parameters.projectProductsDataset;
            this.fetchCounts(dataset); 
            
        }).catch((error: any) => {
            console.error("Error al crear líneas", error);
            alert(this.t("AlertErrorCreatingLines"));
        });
    }

    private openNewRecordModal(): void {
        const entityFormOptions: ComponentFramework.NavigationApi.EntityFormOptions = {
            entityName: this.LOGICAL_NAME_PADRE_ENTIDAD,
            useQuickCreateForm: true 
        };

        const formParameters: any = {};
        
        const pageContext = (this._context as any).page;
        if (pageContext && pageContext.entityId) {
            formParameters["sec_proyectoid"] = pageContext.entityId;
            formParameters["sec_proyectoidname"] = pageContext.primaryFieldValue || this.t("CurrentProjectFallback");
            formParameters["sec_proyectoidtype"] = pageContext.entityTypeName || "sec_proyecto";
        }

        this._context.navigation.openForm(entityFormOptions, formParameters).then(
            (success) => {
                this._context.parameters.projectProductsDataset.refresh();
            },
            (error: any) => {
                console.error("Error al abrir formulario de nuevo registro", error);
            }
        );
    }

    private openEditRecordModal(recordId: string): void {
        const entityFormOptions: ComponentFramework.NavigationApi.EntityFormOptions = {
            entityName: this.LOGICAL_NAME_PADRE_ENTIDAD,
            entityId: recordId,
            openInNewWindow: true,
            windowPosition: 1 
        };

        this._context.navigation.openForm(entityFormOptions).then(
            (success) => {
                this._context.parameters.projectProductsDataset.refresh();
            },
            (error: any) => {
                console.error("Error al abrir formulario de edición", error);
            }
        );
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        if (this._resizeHandler) {
            window.removeEventListener("resize", this._resizeHandler);
        }
    }
}